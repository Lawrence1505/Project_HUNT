/** Client-side mirrors of the server validation rules (docs/AUTH-CONTRACT.md). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9][0-9]{9,14}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Strip spaces, dashes, parens and dots — same normalization as the server. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

/** E.164 with country code, e.g. +919876543210. */
export function isValidPhone(raw: string): boolean {
  return PHONE_RE.test(normalizePhone(raw));
}

/** Returns a human message when the password breaks a rule, else null. */
export function passwordError(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[a-zA-Z]/.test(pw)) return "Password needs at least one letter";
  if (!/[0-9]/.test(pw)) return "Password needs at least one number";
  return null;
}
