import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { audit } from "../lib/audit.js";
import {
  signSessionToken,
  verifySessionToken,
  signProofToken,
  verifyProofToken,
} from "../lib/tokens.js";
import {
  normalizeName,
  normalizeEmail,
  normalizePhone,
  isEmail,
  isPhone,
  isName,
  passwordIssue,
  identifierFromBody,
  classifyIdentifier,
} from "../lib/validate.js";
import { issueOtp, verifyOtp, devEchoEnabled } from "../services/otpService.js";
import { pool } from "../db.js";
import { sendOtpEmail } from "../services/emailService.js";
import { sendOtpSms, smsProvider, verifyFirebaseIdToken } from "../services/phoneService.js";
import {
  publicUser,
  findByEmail,
  findByPhone,
  findByIdentifier,
  findById,
  createUser,
  updatePassword,
} from "../services/userService.js";

const router = Router();

/** Route errors funnel to the JSON error middleware in index.js. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// A valid bcrypt hash of a random value. When sign-in hits a non-existent
// account we still run bcrypt.compare against this so response timing doesn't
// reveal whether the account exists.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 11);

async function authRequired(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  try {
    const user = await findById(payload.sub);
    // Reject sessions minted before the last password change.
    if (!user || (payload.tv ?? 0) !== (user.token_version ?? 0)) {
      return res.status(401).json({ error: "Session no longer valid — sign in again" });
    }
    req.auth = payload;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Shared parse/validate for the two OTP endpoints. → { error } | fields. */
function parseOtpBody(body) {
  const { channel, purpose } = body ?? {};
  if (channel !== "email" && channel !== "phone")
    return { error: "channel must be 'email' or 'phone'" };
  if (purpose !== "signup" && purpose !== "reset")
    return { error: "purpose must be 'signup' or 'reset'" };
  const parsed = identifierFromBody(channel, body);
  if (parsed.error) return { error: parsed.error };
  return { channel, purpose, identifier: parsed.identifier };
}

/* ---------- OTP request / verify ---------- */

router.post(
  "/otp/request",
  wrap(async (req, res) => {
    const parsed = parseOtpBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { channel, purpose, identifier } = parsed;

    if (channel === "phone" && smsProvider() === "firebase") {
      return res.status(400).json({
        error: "Phone codes are sent by Firebase on this server — use the Firebase flow",
        code: "USE_FIREBASE",
      });
    }

    const existing = await findByIdentifier(channel, identifier);

    if (purpose === "signup" && existing) {
      return res.status(409).json({
        error:
          channel === "email"
            ? "An account with this email already exists"
            : "An account with this phone number already exists",
        code: "ALREADY_REGISTERED",
      });
    }

    // Anti-enumeration: reset always returns the SAME generic 200 — whether or
    // not the account exists, and regardless of cooldown / resend-limit. The
    // OTP is only generated + sent for a real account; cooldown/cap 429s are
    // swallowed so they can't be used as an existence oracle.
    if (purpose === "reset") {
      const generic = { ok: true, resendAfter: 30, expiresIn: 300 };
      if (existing) {
        const issued = await issueOtp({ identifier, channel, purpose, ip: req.ip });
        let sent = false;
        if (issued.ok) {
          try {
            // Send failures must NOT leak account existence — swallow for reset.
            if (channel === "email") await sendOtpEmail(identifier, issued.otp, purpose);
            else await sendOtpSms(identifier, issued.otp, purpose);
            sent = true;
          } catch (err) {
            console.error("reset OTP send failed:", err.message);
          }
          if (sent && devEchoEnabled()) generic.devOtp = issued.otp;
        }
        await audit("reset_requested", identifier, req.ip, {
          channel,
          accountExists: true,
          sent,
        });
      } else {
        await audit("reset_requested", identifier, req.ip, { channel, accountExists: false });
      }
      return res.json(generic);
    }

    const issued = await issueOtp({ identifier, channel, purpose, ip: req.ip });
    if (!issued.ok) return res.status(issued.status).json(issued.body);

    // Signup: a delivery failure is surfaced clearly (the user needs the code).
    try {
      if (channel === "email") await sendOtpEmail(identifier, issued.otp, purpose);
      else await sendOtpSms(identifier, issued.otp, purpose);
    } catch (err) {
      if (err?.code === "EMAIL_SEND_FAILED")
        return res.status(502).json({ error: err.message, code: "EMAIL_SEND_FAILED" });
      throw err;
    }

    const response = { ok: true, resendAfter: issued.resendAfter, expiresIn: issued.expiresIn };
    if (devEchoEnabled()) response.devOtp = issued.otp;
    res.json(response);
  })
);

router.post(
  "/otp/verify",
  wrap(async (req, res) => {
    const parsed = parseOtpBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { channel, purpose, identifier } = parsed;

    const otp = String(req.body?.otp ?? "").trim();
    if (!/^[0-9]{6}$/.test(otp)) return res.status(400).json({ error: "Enter the 6-digit code" });

    const result = await verifyOtp({ identifier, channel, purpose, otp, ip: req.ip });
    if (!result.ok) return res.status(result.status).json(result.body);

    res.json({ proofToken: signProofToken({ channel, purpose, identifier }), channel, purpose });
  })
);

/* ---------- Firebase phone verification ---------- */

router.post(
  "/phone/firebase",
  wrap(async (req, res) => {
    const { idToken, purpose } = req.body ?? {};
    if (purpose !== "signup" && purpose !== "reset")
      return res.status(400).json({ error: "purpose must be 'signup' or 'reset'" });
    if (!idToken) return res.status(400).json({ error: "idToken is required" });

    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified.ok) return res.status(400).json({ error: verified.error });

    const phone = normalizePhone(verified.phone);
    await audit("otp_verified", phone, req.ip, { channel: "phone", purpose, provider: "firebase" });
    res.json({ proofToken: signProofToken({ channel: "phone", purpose, identifier: phone }), phone });
  })
);

/* ---------- Signup / signin / reset / me ---------- */

router.post(
  "/signup",
  wrap(async (req, res) => {
    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    // Phone is OPTIONAL (email-only verification). Stored if a valid one is given.
    const rawPhone = normalizePhone(req.body?.phone);
    const phone = rawPhone ? rawPhone : null;
    const password = String(req.body?.password ?? "");

    if (!isName(name))
      return res.status(400).json({ error: "Name must be 2–100 characters" });
    if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email address" });
    if (phone && !isPhone(phone))
      return res
        .status(400)
        .json({ error: "Enter a valid phone number with country code (e.g. +91 98765 43210)" });
    const pwIssue = passwordIssue(password);
    if (pwIssue) return res.status(400).json({ error: pwIssue });

    // Only email verification is required.
    const emailProof = verifyProofToken(req.body?.emailProof, {
      purpose: "signup",
      channel: "email",
    });
    if (!emailProof || emailProof.idf !== email) {
      return res.status(400).json({
        error: "Email verification is missing or no longer valid — verify your email again",
        code: "BAD_PROOF",
      });
    }

    // Optional: if a phone was verified (dev OTP or Firebase), honor its proof.
    let phoneVerified = false;
    if (phone && req.body?.phoneProof) {
      const phoneProof = verifyProofToken(req.body.phoneProof, {
        purpose: "signup",
        channel: "phone",
      });
      if (!phoneProof || phoneProof.idf !== phone) {
        return res.status(400).json({
          error: "Phone verification is missing or no longer valid — verify your phone again",
          code: "BAD_PROOF",
        });
      }
      phoneVerified = true;
    }

    if (await findByEmail(email)) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists", code: "ALREADY_REGISTERED" });
    }
    if (phone && (await findByPhone(phone))) {
      return res.status(409).json({
        error: "An account with this phone number already exists",
        code: "ALREADY_REGISTERED",
      });
    }

    let user;
    try {
      user = await createUser({
        name,
        email,
        phone,
        passwordHash: await bcrypt.hash(password, 11),
        phoneVerified,
      });
    } catch (err) {
      if (err?.code === "23505") {
        return res
          .status(409)
          .json({ error: "An account with this email or phone already exists", code: "ALREADY_REGISTERED" });
      }
      throw err;
    }

    await audit("signup", email, req.ip, { phone });
    res.status(201).json({ token: signSessionToken(user), user: publicUser(user) });
  })
);

router.post(
  "/signin",
  wrap(async (req, res) => {
    const password = String(req.body?.password ?? "");
    // `identifier` is email OR phone; legacy clients send `email`.
    const classified = classifyIdentifier(req.body?.identifier ?? req.body?.email);

    const user = classified
      ? await findByIdentifier(classified.channel, classified.identifier)
      : null;
    // Always run a bcrypt compare (dummy hash when absent) for constant timing.
    const ok = (await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)) && !!user;
    if (!ok) {
      await audit("signin_failed", classified?.identifier ?? null, req.ip, null);
      return res.status(401).json({ error: "Invalid email/phone or password" });
    }

    // Email-only verification: an account can't exist unless its email was
    // verified at signup, but we keep this gate as a safety net.
    if (!user.email_verified) {
      return res
        .status(403)
        .json({ error: "Your email isn't verified yet — verify it to sign in", code: "UNVERIFIED_EMAIL" });
    }

    await audit("signin_ok", classified.identifier, req.ip, null);
    res.json({ token: signSessionToken(user), user: publicUser(user) });
  })
);

router.post(
  "/reset",
  wrap(async (req, res) => {
    const proof = verifyProofToken(req.body?.proofToken, { purpose: "reset" });
    if (!proof) {
      return res.status(400).json({
        error: "Verification is missing or expired — verify your email or phone again",
        code: "BAD_PROOF",
      });
    }

    const newPassword = String(req.body?.newPassword ?? "");
    const pwIssue = passwordIssue(newPassword);
    if (pwIssue) return res.status(400).json({ error: pwIssue });

    const user = await findByIdentifier(proof.channel, proof.idf);
    if (!user) {
      return res.status(400).json({
        error: "Verification is missing or expired — verify your email or phone again",
        code: "BAD_PROOF",
      });
    }

    // Single use: atomically claim the proof's jti before changing anything.
    const claim = await pool.query(
      `INSERT INTO consumed_proofs (jti) VALUES ($1) ON CONFLICT DO NOTHING`,
      [String(proof.jti ?? "")]
    );
    if (!proof.jti || claim.rowCount === 0) {
      return res.status(400).json({
        error: "This verification code was already used — request a new one",
        code: "BAD_PROOF",
      });
    }

    await updatePassword(user.id, await bcrypt.hash(newPassword, 11));
    await audit("reset_ok", proof.idf, req.ip, { channel: proof.channel });
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  authRequired,
  wrap(async (req, res) => {
    // authRequired already loaded + validated the user.
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
