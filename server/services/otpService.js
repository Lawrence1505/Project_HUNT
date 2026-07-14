import crypto from "node:crypto";
import { pool } from "../db.js";
import { audit } from "../lib/audit.js";

export const OTP_TTL_SECONDS = 300; // codes expire 5 minutes after send
export const RESEND_COOLDOWN_SECONDS = 30; // min gap between sends
export const MAX_ATTEMPTS = 5; // wrong verifies before the row locks
export const MAX_SENDS_PER_HOUR = 5; // per identifier+purpose, via audit_logs

/**
 * devOtp echo is allowed ONLY when explicitly in development. Fail-closed: an
 * unset NODE_ENV disables the echo, so a production deploy that forgets to set
 * NODE_ENV never leaks OTPs in HTTP responses.
 */
export function devEchoEnabled() {
  return process.env.DEV_ECHO_OTP === "true" && process.env.NODE_ENV === "development";
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(otp, identifier) {
  return crypto
    .createHash("sha256")
    .update(otp + (process.env.OTP_PEPPER ?? "") + identifier)
    .digest("hex");
}

/**
 * Run `fn(client)` inside a transaction holding a Postgres advisory lock keyed
 * to identifier+channel+purpose, so all concurrent issue/verify operations on
 * the same OTP serialize — closing the read-modify-write races on the attempt
 * counter, the resend cooldown, and the hourly cap.
 */
async function withKeyLock(identifier, channel, purpose, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `${channel}:${purpose}:${identifier}`,
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already broken */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Console block used by the email fallback and the dev SMS sender — the only
 * contract-sanctioned places a plaintext OTP may reach the server console.
 */
export function formatOtpConsoleBlock({ channel, to, otp, purpose, via }) {
  const line = "─".repeat(60);
  return [
    "",
    `┌${line}`,
    `│ HEAL ${channel === "phone" ? "SMS" : "email"} OTP  (${via})`,
    `│ To:      ${to}`,
    `│ Purpose: ${purpose}`,
    `│ Code:    ${otp}`,
    `│ Expires: in ${OTP_TTL_SECONDS / 60} minutes`,
    `└${line}`,
    "",
  ].join("\n");
}

/**
 * Generate + store a new OTP for identifier/channel/purpose, enforcing the
 * 30 s resend cooldown and the 5-sends-per-hour cap. Replaces any previous
 * row for the same key (atomic upsert under an advisory lock). Returns:
 *   { ok:true, otp, resendAfter, expiresIn }
 *   { ok:false, status, body } for cooldown / resend-limit rejections
 */
export async function issueOtp({ identifier, channel, purpose, ip }) {
  await cleanupExpiredOtps(); // opportunistic sweep

  return withKeyLock(identifier, channel, purpose, async (client) => {
    const { rows: current } = await client.query(
      `SELECT created_at FROM user_otps
       WHERE identifier = $1 AND channel = $2 AND purpose = $3
       ORDER BY created_at DESC LIMIT 1`,
      [identifier, channel, purpose]
    );
    if (current[0]) {
      const elapsed = (Date.now() - new Date(current[0].created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const retryAfter = Math.max(1, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
        return {
          ok: false,
          status: 429,
          body: {
            error: `Please wait ${retryAfter}s before requesting a new code`,
            code: "COOLDOWN",
            retryAfter,
          },
        };
      }
    }

    const { rows: sends } = await client.query(
      `SELECT count(*)::int AS count FROM audit_logs
       WHERE event = 'otp_sent' AND identifier = $1 AND meta->>'purpose' = $2
         AND created_at > now() - interval '1 hour'`,
      [identifier, purpose]
    );
    if (sends[0].count >= MAX_SENDS_PER_HOUR) {
      return {
        ok: false,
        status: 429,
        body: { error: "Too many codes requested — try again in an hour", code: "RESEND_LIMIT" },
      };
    }

    const otp = generateOtp();
    // UNIQUE(identifier, channel, purpose) makes this a single-row replacement.
    await client.query(
      `INSERT INTO user_otps (identifier, channel, purpose, otp_hash, attempts, locked, expires_at)
       VALUES ($1, $2, $3, $4, 0, false, now() + make_interval(secs => $5))
       ON CONFLICT (identifier, channel, purpose)
       DO UPDATE SET otp_hash = EXCLUDED.otp_hash, attempts = 0, locked = false,
                     expires_at = EXCLUDED.expires_at, created_at = now()`,
      [identifier, channel, purpose, hashOtp(otp, identifier), OTP_TTL_SECONDS]
    );
    await audit("otp_sent", identifier, ip, { channel, purpose }, client);

    return { ok: true, otp, resendAfter: RESEND_COOLDOWN_SECONDS, expiresIn: OTP_TTL_SECONDS };
  });
}

/**
 * Check a submitted OTP. Single use: the row is deleted on success. The whole
 * read-compare-bump runs under an advisory lock so concurrent guesses can't
 * lose attempt increments (the 5-attempt cap is the only IP-independent
 * backstop against the 10^6 keyspace). Returns:
 *   { ok:true }
 *   { ok:false, status, body } → 404 NO_OTP · 410 OTP_EXPIRED ·
 *                                423 OTP_LOCKED · 400 INVALID_OTP (attemptsLeft)
 * For purpose 'reset' a missing row is reported as INVALID_OTP (not NO_OTP) so
 * verification cannot be used to enumerate which accounts exist.
 */
export async function verifyOtp({ identifier, channel, purpose, otp, ip }) {
  const invalidOtpBody = {
    ok: false,
    status: 400,
    body: { error: "Incorrect code", code: "INVALID_OTP" },
  };

  return withKeyLock(identifier, channel, purpose, async (client) => {
    const { rows } = await client.query(
      `SELECT id, otp_hash, attempts, locked, expires_at FROM user_otps
       WHERE identifier = $1 AND channel = $2 AND purpose = $3
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [identifier, channel, purpose]
    );
    const row = rows[0];
    if (!row) {
      if (purpose === "reset") return invalidOtpBody; // anti-enumeration
      return {
        ok: false,
        status: 404,
        body: { error: "No code was requested — request a new one", code: "NO_OTP" },
      };
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await client.query(`DELETE FROM user_otps WHERE id = $1`, [row.id]);
      return {
        ok: false,
        status: 410,
        body: { error: "That code has expired — request a new one", code: "OTP_EXPIRED" },
      };
    }
    if (row.locked) {
      return {
        ok: false,
        status: 423,
        body: { error: "Too many wrong attempts — request a new code later", code: "OTP_LOCKED" },
      };
    }

    const expected = Buffer.from(row.otp_hash, "hex");
    const actual = Buffer.from(hashOtp(String(otp), identifier), "hex");
    const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!match) {
      const attempts = row.attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await client.query(`UPDATE user_otps SET attempts = $2, locked = $3 WHERE id = $1`, [
        row.id,
        attempts,
        locked,
      ]);
      await audit("otp_verify_failed", identifier, ip, { channel, purpose, attempts }, client);
      if (locked) {
        await audit("otp_locked", identifier, ip, { channel, purpose }, client);
        return {
          ok: false,
          status: 423,
          body: { error: "Too many wrong attempts — code locked until it expires", code: "OTP_LOCKED" },
        };
      }
      return {
        ok: false,
        status: 400,
        body: { error: "Incorrect code", code: "INVALID_OTP", attemptsLeft: MAX_ATTEMPTS - attempts },
      };
    }

    await client.query(`DELETE FROM user_otps WHERE id = $1`, [row.id]);
    await audit("otp_verified", identifier, ip, { channel, purpose }, client);
    return { ok: true };
  });
}

/** Delete expired rows + stale audit/proof records. Called opportunistically and hourly. */
export async function cleanupExpiredOtps() {
  try {
    await pool.query(`DELETE FROM user_otps WHERE expires_at < now()`);
    // Consumed-proof claims only need to outlive the 30-min proof TTL.
    await pool.query(
      `DELETE FROM consumed_proofs WHERE consumed_at < now() - interval '1 hour'`
    );
    // Bound audit_logs growth: keep 90 days of security history.
    await pool.query(`DELETE FROM audit_logs WHERE created_at < now() - interval '90 days'`);
  } catch (err) {
    console.error("otp cleanup failed:", err.message);
  }
}
