import jwt from "jsonwebtoken";
import crypto from "node:crypto";

/** Session + proof JWT sign/verify. JWT_SECRET is validated at startup in index.js. */

const SESSION_TTL = "7d";
const PROOF_TTL = "30m";

export function signSessionToken(userRow) {
  return jwt.sign(
    { sub: String(userRow.id), email: userRow.email, tv: userRow.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_TTL }
  );
}

/** Throws on an invalid/expired token — callers catch. */
export function verifySessionToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/** Short-lived proof that an identifier was verified over a channel.
 *  Carries a jti so consuming endpoints (password reset) can enforce single use. */
export function signProofToken({ channel, purpose, identifier }) {
  return jwt.sign(
    { kind: "proof", channel, purpose, idf: identifier, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: PROOF_TTL }
  );
}

/**
 * Verify a proof JWT. Returns the payload ({ kind, channel, purpose, idf })
 * or null when invalid, expired, or not matching the expected purpose/channel.
 */
export function verifyProofToken(token, { purpose, channel } = {}) {
  try {
    const payload = jwt.verify(String(token ?? ""), process.env.JWT_SECRET);
    if (payload.kind !== "proof") return null;
    if (purpose && payload.purpose !== purpose) return null;
    if (channel && payload.channel !== channel) return null;
    return payload;
  } catch {
    return null;
  }
}
