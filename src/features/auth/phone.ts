/// <reference types="vite/client" />
/**
 * Phone-OTP provider abstraction (docs/AUTH-CONTRACT.md).
 *
 * - 'dev' (default): the backend generates/checks the code via
 *   POST /auth/otp/request + /auth/otp/verify (delivered to the server console).
 * - 'firebase': client-side Firebase Phone Auth — invisible reCAPTCHA +
 *   signInWithPhoneNumber; the resulting ID token is exchanged for a proof
 *   token at POST /auth/phone/firebase. Firebase is dynamic-imported so the
 *   SDK never loads in dev mode.
 */
import { api } from "../../lib/api";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

export type OtpPurpose = "signup" | "reset";

/** Shape of a successful POST /auth/otp/request response. */
export interface OtpSendInfo {
  ok?: boolean;
  resendAfter?: number;
  expiresIn?: number;
  /** Present only when the server runs with DEV_ECHO_OTP=true (never in prod). */
  devOtp?: string;
}

export type SmsProvider = "dev" | "firebase";

export function smsProvider(): SmsProvider {
  return import.meta.env.VITE_SMS_PROVIDER === "firebase" ? "firebase" : "dev";
}

/** Default id of the div the invisible reCAPTCHA binds to. */
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

// Module-level Firebase session state (survives step navigation).
let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

function firebaseErrorToMessage(err: unknown): Error {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-verification-code":
      return new Error("Invalid code — check the SMS and try again.");
    case "auth/code-expired":
      return new Error("That code has expired — request a new one.");
    case "auth/too-many-requests":
      return new Error("Too many attempts — please wait a while and try again.");
    case "auth/invalid-phone-number":
      return new Error("That phone number was rejected — use the +countrycode format.");
    default:
      return err instanceof Error ? err : new Error("Phone verification failed");
  }
}

/**
 * Send a phone OTP. In firebase mode, `containerId` must be the id of a div
 * currently in the DOM (the invisible reCAPTCHA mounts there).
 */
export async function requestPhoneOtp(
  phone: string,
  purpose: OtpPurpose,
  containerId: string = RECAPTCHA_CONTAINER_ID
): Promise<OtpSendInfo> {
  if (smsProvider() === "dev") {
    return api<OtpSendInfo>("/auth/otp/request", {
      body: { channel: "phone", purpose, phone },
    });
  }

  const [{ initializeApp, getApps, getApp }, authMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      });
  const auth = authMod.getAuth(app);

  try {
    if (verifier) {
      try {
        verifier.clear();
      } catch {
        /* container may already be gone */
      }
      verifier = null;
    }
    verifier = new authMod.RecaptchaVerifier(auth, containerId, { size: "invisible" });
    confirmation = await authMod.signInWithPhoneNumber(auth, phone, verifier);
  } catch (err) {
    throw firebaseErrorToMessage(err);
  }
  // Firebase doesn't report timings; mirror the server defaults for the UI.
  return { ok: true, resendAfter: 30, expiresIn: 300 };
}

/** Confirm a phone OTP. Resolves to the proof token for /auth/signup or /auth/reset. */
export async function confirmPhoneOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string
): Promise<string> {
  if (smsProvider() === "dev") {
    const res = await api<{ proofToken: string }>("/auth/otp/verify", {
      body: { channel: "phone", purpose, phone, otp: code },
    });
    return res.proofToken;
  }

  if (!confirmation) {
    throw new Error("No verification in progress — request a new code first.");
  }
  let idToken: string;
  try {
    const cred = await confirmation.confirm(code);
    idToken = await cred.user.getIdToken();
  } catch (err) {
    throw firebaseErrorToMessage(err);
  }
  const res = await api<{ proofToken: string; phone: string }>("/auth/phone/firebase", {
    body: { idToken, purpose },
  });
  confirmation = null;
  return res.proofToken;
}
