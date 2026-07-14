import jwt from "jsonwebtoken";
import { formatOtpConsoleBlock } from "./otpService.js";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CERT_CACHE_TTL_MS = 60 * 60 * 1000; // ~1 hour
const CERT_FETCH_TIMEOUT_MS = 5000;

let certCache = { certs: null, fetchedAt: 0 };
let inFlight = null; // dedup concurrent fetches

export function smsProvider() {
  return process.env.SMS_PROVIDER === "firebase" ? "firebase" : "dev";
}

/** Dev provider: "deliver" the OTP to the server console. */
export async function sendOtpSms(phone, otp, purpose) {
  console.log(
    formatOtpConsoleBlock({ channel: "phone", to: phone, otp, purpose, via: "SMS_PROVIDER=dev" })
  );
}

/**
 * Return Google's securetoken signing certs, refetching ONLY when the cache is
 * stale (TTL-based). An unknown `kid` never triggers a fetch — that just means
 * the token is invalid — so an attacker can't turn /phone/firebase into an
 * outbound-request amplifier. Concurrent refreshes are deduplicated and the
 * fetch is bounded by a timeout.
 */
async function getGoogleCerts() {
  const fresh = certCache.certs && Date.now() - certCache.fetchedAt < CERT_CACHE_TTL_MS;
  if (fresh) return certCache.certs;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(GOOGLE_CERTS_URL, {
        signal: AbortSignal.timeout(CERT_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Google certs fetch failed (HTTP ${res.status})`);
      certCache = { certs: await res.json(), fetchedAt: Date.now() };
      return certCache.certs;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Verify a Firebase Phone Auth ID token (RS256 against Google securetoken
 * x509 certs, issuer/audience bound to FIREBASE_PROJECT_ID) and require a
 * phone_number claim. → { ok:true, phone } or { ok:false, error }.
 */
export async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    return {
      ok: false,
      error:
        "Firebase phone verification is not configured on this server (FIREBASE_PROJECT_ID is unset)",
    };
  }

  const decoded = jwt.decode(String(idToken ?? ""), { complete: true });
  if (!decoded?.header?.kid) return { ok: false, error: "Invalid Firebase ID token" };

  let certs;
  try {
    certs = await getGoogleCerts();
  } catch (err) {
    console.error("firebase cert fetch failed:", err.message);
    return { ok: false, error: "Could not reach Google signing certificates — try again" };
  }
  const cert = certs[decoded.header.kid];
  if (!cert) return { ok: false, error: "Invalid Firebase ID token (unknown signing key)" };

  let payload;
  try {
    payload = jwt.verify(idToken, cert, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
  } catch {
    return { ok: false, error: "Invalid or expired Firebase ID token" };
  }

  if (!payload.phone_number)
    return { ok: false, error: "Firebase token has no verified phone number" };
  return { ok: true, phone: payload.phone_number };
}
