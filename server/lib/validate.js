/**
 * Shared validators + normalizers — the ONLY place identifiers are normalized.
 * Rules mirror docs/AUTH-CONTRACT.md and the frontend.
 */

// Domain tail segments exclude '.', so there is exactly one way to split the
// pattern — no ambiguous backtracking. Combined with the length cap in isEmail,
// this closes the polynomial-ReDoS path on untrusted input.
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const PHONE_RE = /^\+[1-9][0-9]{9,14}$/; // E.164 with country code

export const MAX_EMAIL = 254; // RFC 5321
export const MAX_NAME = 100;
export const MAX_PASSWORD = 200; // bcrypt only uses 72 bytes; cap the request
export const MAX_PHONE = 20;

export function normalizeEmail(raw) {
  return String(raw ?? "").trim().toLowerCase();
}

export function normalizePhone(raw) {
  return String(raw ?? "").trim().replace(/[\s\-().]/g, "");
}

export function normalizeName(raw) {
  return String(raw ?? "").trim();
}

export function isEmail(value) {
  // Length cap BEFORE the regex bounds worst-case matching to microseconds.
  return typeof value === "string" && value.length <= MAX_EMAIL && EMAIL_RE.test(value);
}

export function isPhone(value) {
  return typeof value === "string" && value.length <= MAX_PHONE && PHONE_RE.test(value);
}

export function isName(value) {
  return typeof value === "string" && value.trim().length >= 2 && value.length <= MAX_NAME;
}

/** Returns an error message when the password breaks the rules, else null. */
export function passwordIssue(password) {
  if (typeof password !== "string" || password.length < 8)
    return "Password must be at least 8 characters";
  if (password.length > MAX_PASSWORD) return "Password is too long";
  if (!/[A-Za-z]/.test(password)) return "Password must include at least one letter";
  if (!/[0-9]/.test(password)) return "Password must include at least one number";
  return null;
}

/**
 * Pull + normalize the identifier matching `channel` from a request body.
 * → { identifier } on success, { error } on failure.
 */
export function identifierFromBody(channel, body) {
  if (channel === "email") {
    const email = normalizeEmail(body?.email);
    if (!isEmail(email)) return { error: "Enter a valid email address" };
    return { identifier: email };
  }
  if (channel === "phone") {
    const phone = normalizePhone(body?.phone);
    if (!isPhone(phone))
      return { error: "Enter a valid phone number with country code (e.g. +91 98765 43210)" };
    return { identifier: phone };
  }
  return { error: "channel must be 'email' or 'phone'" };
}

/**
 * Classify a free-form sign-in identifier as email or phone.
 * → { channel, identifier } or null when it is neither.
 */
export function classifyIdentifier(raw) {
  const email = normalizeEmail(raw);
  if (isEmail(email)) return { channel: "email", identifier: email };
  const phone = normalizePhone(raw);
  if (isPhone(phone)) return { channel: "phone", identifier: phone };
  return null;
}
