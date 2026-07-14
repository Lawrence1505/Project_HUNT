import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, KeyRound, Send } from "lucide-react";
import { api } from "../../lib/api";
import { AuthLayout, AuthError } from "./AuthLayout";
import { OtpStep, type SendRecord } from "./OtpStep";
import {
  requestPhoneOtp,
  confirmPhoneOtp,
  RECAPTCHA_CONTAINER_ID,
  type OtpSendInfo,
} from "./phone";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  passwordError,
} from "./validation";

type Phase = "identifier" | "otp" | "password" | "done";

const PHASES: Array<{ key: Phase; label: string }> = [
  { key: "identifier", label: "Account" },
  { key: "otp", label: "Code" },
  { key: "password", label: "New password" },
];

function PhaseChips({ phase }: { phase: Phase }) {
  const idx = phase === "done" ? PHASES.length : PHASES.findIndex((p) => p.key === phase);
  return (
    <div
      className="row wrap"
      style={{ justifyContent: "center", gap: 6, marginBottom: 18 }}
      aria-label="Password reset progress"
    >
      {PHASES.map((p, i) => (
        <span
          key={p.key}
          className={`chip ${i === idx ? "chip-active" : ""}`}
          style={i < idx ? { color: "var(--success)" } : undefined}
          aria-current={i === idx ? "step" : undefined}
        >
          {i < idx ? "✓" : i + 1} {p.label}
        </span>
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>("identifier");

  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [idf, setIdf] = useState("");

  const [sendRec, setSendRec] = useState<SendRecord | null>(null);
  const [proofToken, setProofToken] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function requestOtp(ch: "email" | "phone", id: string): Promise<OtpSendInfo> {
    return ch === "email"
      ? api<OtpSendInfo>("/auth/otp/request", {
          body: { channel: "email", purpose: "reset", email: id },
        })
      : requestPhoneOtp(id, "reset");
  }

  async function onIdentifierSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let ch: "email" | "phone";
    let id: string;
    if (isValidEmail(identifier)) {
      ch = "email";
      id = normalizeEmail(identifier);
    } else if (isValidPhone(identifier)) {
      ch = "phone";
      id = normalizePhone(identifier);
    } else {
      setError("Enter the email or phone (+country code) on your account");
      return;
    }
    setBusy(true);
    try {
      const info = await requestOtp(ch, id);
      setChannel(ch);
      setIdf(id);
      setSendRec({ info, at: Date.now() });
      setProofToken(null);
      setPhase("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pwErr = passwordError(newPassword);
    if (pwErr) return setError(pwErr);
    if (newPassword !== confirm) return setError("Passwords don't match");
    if (!proofToken) return setError("Verification expired — start over");
    setBusy(true);
    try {
      await api<{ ok: boolean }>("/auth/reset", {
        body: { proofToken, newPassword },
      });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Verify it's you, then pick a new password.">
      {phase !== "done" && <PhaseChips phase={phase} />}

      {phase === "identifier" && (
        <>
          <AuthError message={error} />
          <form onSubmit={onIdentifierSubmit} className="col" style={{ gap: 14 }}>
            <div>
              <label className="label" htmlFor="forgot-identifier">
                Email or phone
              </label>
              <input
                id="forgot-identifier"
                className="input"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or +91 98765 43210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              If an account exists for that email or phone, we'll send a 6-digit code.
            </p>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <Send size={16} />
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        </>
      )}

      {phase === "otp" && (
        <div className="col" style={{ gap: 14 }}>
          <OtpStep
            key={`${channel}-${idf}`}
            channelLabel={channel}
            identifier={idf}
            note={`If an account exists for ${idf}, a code is on its way. Enter it below.`}
            send={() => requestOtp(channel, idf)}
            verify={async (otp) => {
              if (channel === "email") {
                const res = await api<{ proofToken: string }>("/auth/otp/verify", {
                  body: { channel: "email", purpose: "reset", email: idf, otp },
                });
                return res.proofToken;
              }
              return confirmPhoneOtp(idf, "reset", otp);
            }}
            verified={proofToken !== null}
            priorSend={sendRec}
            onSent={setSendRec}
            onVerified={(token) => {
              setProofToken(token);
              setError(null);
              setPhase("password");
            }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPhase("identifier")}
            style={{ alignSelf: "center" }}
          >
            Use a different email or phone
          </button>
        </div>
      )}

      {phase === "password" && (
        <>
          <AuthError message={error} />
          <form onSubmit={onPasswordSubmit} className="col" style={{ gap: 14 }}>
            <div>
              <label className="label" htmlFor="forgot-password">
                New password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="forgot-password"
                  className="input"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="8+ chars with a letter and a number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="forgot-confirm">
                Confirm new password
              </label>
              <input
                id="forgot-confirm"
                className="input"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Same password again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <KeyRound size={16} />
              {busy ? "Updating…" : "Set new password"}
            </button>
          </form>
        </>
      )}

      {phase === "done" && (
        <div className="col" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
          <CheckCircle2 size={36} color="var(--success)" aria-hidden />
          <p className="muted" style={{ margin: 0 }}>
            Your password has been updated. Sign in with your new password to continue your climb.
          </p>
          <Link to="/signin" className="btn btn-primary">
            Back to sign in
          </Link>
        </div>
      )}

      {/* Invisible reCAPTCHA mounts here when VITE_SMS_PROVIDER=firebase */}
      <div id={RECAPTCHA_CONTAINER_ID} />

      {phase !== "done" && (
        <>
          <hr className="divider" style={{ margin: "18px 0" }} />
          <p className="small muted" style={{ textAlign: "center" }}>
            Remembered it?{" "}
            <Link to="/signin" style={{ fontWeight: 650 }}>
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
