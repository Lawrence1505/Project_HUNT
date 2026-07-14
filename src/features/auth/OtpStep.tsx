import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import { AuthError } from "./AuthLayout";
import { OtpInput } from "./OtpInput";
import { useCountdown, formatClock } from "./useCountdown";
import type { OtpSendInfo } from "./phone";

/** A successful send + when it happened, so deadlines survive step navigation. */
export interface SendRecord {
  info: OtpSendInfo;
  at: number;
}

/** First integer that reads like a seconds hint, e.g. "wait 12 s". */
function parseSeconds(message: string): number | null {
  const m = /(\d+)\s*s(?:ec(?:ond)?s?)?\b/i.exec(message);
  return m ? Number(m[1]) : null;
}

/** "3 attempts left" → 3 (backend embeds it in the INVALID_OTP message). */
function parseAttemptsLeft(message: string): number | null {
  const m = /(\d+)\s*attempts?/i.exec(message);
  return m ? Number(m[1]) : null;
}

/**
 * One full OTP verification step: auto-send on entry (StrictMode-safe),
 * 6-box input, status chip, 5:00 expiry countdown, 30 s resend cooldown,
 * lock/expiry handling and the DEV code hint.
 */
export function OtpStep({
  channelLabel,
  identifier,
  note,
  send,
  verify,
  onVerified,
  verified,
  priorSend = null,
  onSent,
}: {
  channelLabel: "email" | "phone";
  identifier: string;
  /** Override the default "Enter the code sent to …" copy (e.g. generic reset text). */
  note?: string;
  send: () => Promise<OtpSendInfo>;
  verify: (code: string) => Promise<string>;
  onVerified: (proofToken: string) => void;
  verified: boolean;
  priorSend?: SendRecord | null;
  onSent?: (rec: SendRecord) => void;
}) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [sentOnce, setSentOnce] = useState(false);
  const [resendDeadline, setResendDeadline] = useState<number | null>(null);
  const [expiryDeadline, setExpiryDeadline] = useState<number | null>(null);

  const cooldown = useCountdown(resendDeadline);
  const expiryLeft = useCountdown(expiryDeadline);

  function applySend(rec: SendRecord) {
    const { info, at } = rec;
    setSentOnce(true);
    setLocked(false);
    setAttemptsLeft(null);
    setCode("");
    setDevOtp(info.devOtp ?? null);
    setResendDeadline(at + (info.resendAfter ?? 30) * 1000);
    setExpiryDeadline(at + (info.expiresIn ?? 300) * 1000);
  }

  async function doSend() {
    if (pending || verified) return;
    setPending("send");
    setError(null);
    try {
      const rec: SendRecord = { info: await send(), at: Date.now() };
      applySend(rec);
      onSent?.(rec);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // COOLDOWN / RESEND_LIMIT — respect the server's wait if it says one.
        const retryAfter =
          typeof err.data.retryAfter === "number"
            ? err.data.retryAfter
            : parseSeconds(err.message);
        setResendDeadline(Date.now() + (retryAfter ?? 30) * 1000);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Couldn't send the code");
      }
    } finally {
      setPending(null);
    }
  }

  async function doVerify(c: string) {
    if (pending || verified || locked || c.length !== 6) return;
    setPending("verify");
    setError(null);
    try {
      onVerified(await verify(c));
    } catch (err) {
      setCode("");
      if (err instanceof ApiError && err.status === 423) {
        setLocked(true);
        setError("Too many wrong attempts — this code is locked. Wait for it to expire, then resend.");
      } else if (err instanceof ApiError && err.status === 410) {
        setExpiryDeadline(Date.now());
        setError("That code has expired — resend to get a new one.");
      } else if (err instanceof ApiError && err.status === 400) {
        setAttemptsLeft(
          typeof err.data.attemptsLeft === "number"
            ? err.data.attemptsLeft
            : parseAttemptsLeft(err.message)
        );
        setError(err.message || "Invalid code");
      } else {
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    } finally {
      setPending(null);
    }
  }

  // Auto-send on step entry — the ref survives StrictMode's double effect run,
  // and priorSend suppresses a duplicate send after back/forward navigation.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current || verified) return;
    bootRef.current = true;
    if (priorSend && priorSend.at + (priorSend.info.expiresIn ?? 300) * 1000 > Date.now()) {
      applySend(priorSend);
      return;
    }
    void doSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expired =
    !verified && !locked && sentOnce && expiryDeadline !== null && expiryLeft <= 0;
  const status: "idle" | "sent" | "verified" | "expired" | "locked" = verified
    ? "verified"
    : locked
      ? "locked"
      : expired
        ? "expired"
        : sentOnce
          ? "sent"
          : "idle";

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="small muted" style={{ margin: 0 }}>
        {note ?? (
          <>
            Enter the 6-digit code sent to your {channelLabel}{" "}
            <strong style={{ color: "var(--text-1)" }}>{identifier}</strong>.
          </>
        )}
      </p>

      <div className="row wrap" style={{ gap: 6, justifyContent: "center" }}>
        {status === "sent" && <span className="chip chip-active">OTP Sent</span>}
        {status === "verified" && (
          <span className="chip" style={{ color: "var(--success)" }}>
            Verified ✓
          </span>
        )}
        {status === "expired" && (
          <span className="chip" style={{ color: "var(--warning)" }}>
            Expired
          </span>
        )}
        {status === "locked" && (
          <span className="chip" style={{ color: "var(--danger)" }}>
            Locked
          </span>
        )}
        {pending === "send" && <span className="chip">Sending…</span>}
        {status === "sent" && (
          <span className="chip mono" title="Time before this code expires">
            expires in {formatClock(expiryLeft)}
          </span>
        )}
      </div>

      <AuthError message={error} />
      {attemptsLeft !== null && attemptsLeft <= 2 && !locked && !verified && (
        <p className="small" role="alert" style={{ color: "var(--warning)", margin: 0 }}>
          Careful — {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before this code locks.
        </p>
      )}

      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={(c) => void doVerify(c)}
        disabled={verified || locked || pending !== null}
        label={`${channelLabel === "email" ? "Email" : "Phone"} verification code`}
      />

      {/* Local-dev convenience ONLY: shown when the Vite build is in dev mode
          AND the server echoed a code (DEV_ECHO_OTP). A production build never
          renders an OTP, even if the server were misconfigured. */}
      {import.meta.env.DEV && devOtp && !verified && (
        <p className="small muted mono" style={{ textAlign: "center", margin: 0, opacity: 0.75 }}>
          DEV code: {devOtp} — dev only; real codes arrive by email/SMS
        </p>
      )}

      <div className="row" style={{ justifyContent: "center", gap: 10 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void doSend()}
          disabled={verified || pending !== null || cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void doVerify(code)}
          disabled={verified || locked || pending !== null || code.length !== 6}
        >
          {pending === "verify" ? "Verifying…" : "Verify"}
        </button>
      </div>
    </div>
  );
}
