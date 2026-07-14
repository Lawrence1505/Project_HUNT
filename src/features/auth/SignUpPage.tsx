import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "../../store/auth";
import { api } from "../../lib/api";
import { AuthLayout, AuthError } from "./AuthLayout";
import { OtpStep, type SendRecord } from "./OtpStep";
import {
  requestPhoneOtp,
  confirmPhoneOtp,
  smsProvider,
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

interface Proof {
  token: string;
  /** The normalized identifier this proof was issued for. */
  idf: string;
}

function StepChips({ steps, step }: { steps: readonly string[]; step: number }) {
  return (
    <div
      className="row wrap"
      style={{ justifyContent: "center", gap: 6, marginBottom: 18 }}
      aria-label="Sign up progress"
    >
      {steps.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <span
            key={label}
            className={`chip ${active ? "chip-active" : ""}`}
            style={done ? { color: "var(--success)" } : undefined}
            aria-current={active ? "step" : undefined}
          >
            {done ? "✓" : i + 1} {label}
          </span>
        );
      })}
    </div>
  );
}

export default function SignUpPage() {
  const signUp = useAuth((s) => s.signUp);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Verification results (survive back/forward navigation)
  const [emailProof, setEmailProof] = useState<Proof | null>(null);
  const [emailSend, setEmailSend] = useState<SendRecord | null>(null);
  const [phoneProof, setPhoneProof] = useState<Proof | null>(null);
  const [phoneSend, setPhoneSend] = useState<SendRecord | null>(null);

  // Final step
  const [creating, setCreating] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);
  const submitRef = useRef(false);

  const normEmail = useMemo(() => normalizeEmail(email), [email]);
  const normPhone = useMemo(() => normalizePhone(phone), [phone]);

  // Phone is optional. When provided, it adds a verification step to the wizard.
  const hasPhone = normPhone.length > 0;
  const STEPS = hasPhone
    ? (["Details", "Verify Email", "Verify Phone", "Done"] as const)
    : (["Details", "Verify Email", "Done"] as const);
  const PHONE_STEP = 2;
  const DONE_STEP = hasPhone ? 3 : 2;

  function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setDetailsError("Name must be at least 2 characters");
    if (!isValidEmail(email)) return setDetailsError("Enter a valid email address");
    if (phone.trim() && !isValidPhone(phone))
      return setDetailsError("Phone must include the country code, e.g. +91 98765 43210");
    const pwErr = passwordError(password);
    if (pwErr) return setDetailsError(pwErr);
    if (password !== confirm) return setDetailsError("Passwords don't match");
    setDetailsError(null);

    // Drop proofs taken for a different identifier than the current one.
    const keepEmail = emailProof !== null && emailProof.idf === normEmail;
    const keepPhone = phoneProof !== null && phoneProof.idf === normPhone;
    if (!keepEmail) {
      setEmailProof(null);
      setEmailSend(null);
    }
    if (!keepPhone) {
      setPhoneProof(null);
      setPhoneSend(null);
    }
    // Advance to the first step still needing verification.
    if (!keepEmail) setStep(1);
    else if (hasPhone && !keepPhone) setStep(PHONE_STEP);
    else setStep(DONE_STEP);
  }

  async function createAccount() {
    if (!emailProof || (hasPhone && !phoneProof) || submitRef.current) return;
    submitRef.current = true;
    setFinalError(null);
    setCreating(true);
    try {
      await signUp({
        name: name.trim(),
        email: normEmail,
        phone: hasPhone ? normPhone : undefined,
        password,
        emailProof: emailProof.token,
        phoneProof: hasPhone ? phoneProof?.token : undefined,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setFinalError(err instanceof Error ? err.message : "Sign up failed");
      submitRef.current = false; // allow Retry
    } finally {
      setCreating(false);
    }
  }

  // All required proofs collected → create the account automatically (once).
  useEffect(() => {
    if (step === DONE_STEP && emailProof && (!hasPhone || phoneProof) && !submitRef.current) {
      void createAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, emailProof, phoneProof, hasPhone]);

  function startOver() {
    setEmailProof(null);
    setEmailSend(null);
    setPhoneProof(null);
    setPhoneSend(null);
    setFinalError(null);
    submitRef.current = false;
    setStep(0);
  }

  return (
    <AuthLayout
      title="Begin your ascent"
      subtitle="One account. Every part of your life, leveling up."
    >
      <StepChips steps={STEPS} step={step} />

      {step === 0 && (
        <>
          <AuthError message={detailsError} />
          <form onSubmit={onDetailsSubmit} className="col" style={{ gap: 14 }}>
            <div>
              <label className="label" htmlFor="signup-name">
                Name
              </label>
              <input
                id="signup-name"
                className="input"
                type="text"
                autoComplete="name"
                placeholder="What should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="signup-phone">
                Phone{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  (optional — we'll verify it)
                </span>
              </label>
              <input
                id="signup-phone"
                className="input"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="signup-password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-password"
                  className="input"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="8+ chars with a letter and a number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
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
              <label className="label" htmlFor="signup-confirm">
                Confirm password
              </label>
              <input
                id="signup-confirm"
                className="input"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: 4 }}>
              <ArrowRight size={16} />
              Continue
            </button>
          </form>
        </>
      )}

      {step === 1 && (
        <div className="col" style={{ gap: 14 }}>
          <OtpStep
            key={`email-${normEmail}`}
            channelLabel="email"
            identifier={normEmail}
            send={() =>
              api<OtpSendInfo>("/auth/otp/request", {
                body: { channel: "email", purpose: "signup", email: normEmail },
              })
            }
            verify={async (otp) => {
              const res = await api<{ proofToken: string }>("/auth/otp/verify", {
                body: { channel: "email", purpose: "signup", email: normEmail, otp },
              });
              return res.proofToken;
            }}
            verified={emailProof !== null}
            priorSend={emailSend}
            onSent={setEmailSend}
            onVerified={(token) => {
              setEmailProof({ token, idf: normEmail });
              setStep(hasPhone ? PHONE_STEP : DONE_STEP);
            }}
          />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>
              <ArrowLeft size={14} />
              Back
            </button>
            {emailProof !== null && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setStep(hasPhone ? PHONE_STEP : DONE_STEP)}
              >
                Continue
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {step === PHONE_STEP && hasPhone && (
        <div className="col" style={{ gap: 14 }}>
          <OtpStep
            key={`phone-${normPhone}`}
            channelLabel="phone"
            identifier={normPhone}
            note={
              smsProvider() === "firebase"
                ? undefined
                : `A code was sent to ${normPhone}. (Dev mode: the code is printed on the API server console.)`
            }
            send={() => requestPhoneOtp(normPhone, "signup", RECAPTCHA_CONTAINER_ID)}
            verify={(otp) => confirmPhoneOtp(normPhone, "signup", otp)}
            verified={phoneProof !== null}
            priorSend={phoneSend}
            onSent={setPhoneSend}
            onVerified={(token) => {
              setPhoneProof({ token, idf: normPhone });
              setStep(DONE_STEP);
            }}
          />
          {/* invisible reCAPTCHA mounts here in Firebase mode */}
          <div id={RECAPTCHA_CONTAINER_ID} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
              <ArrowLeft size={14} />
              Back
            </button>
            {phoneProof !== null && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setStep(DONE_STEP)}
              >
                Continue
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {step === DONE_STEP && (
        <div className="col" style={{ gap: 14, textAlign: "center" }}>
          <AuthError message={finalError} />
          {creating ? (
            <p className="muted" style={{ margin: 0 }}>
              <Sparkles size={16} style={{ verticalAlign: "-3px" }} /> Creating your account…
            </p>
          ) : finalError ? (
            <div className="row" style={{ justifyContent: "center", gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={() => void createAccount()}>
                <RefreshCw size={16} />
                Retry
              </button>
              <button type="button" className="btn btn-ghost" onClick={startOver}>
                Start over
              </button>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Verified — finishing up…
            </p>
          )}
        </div>
      )}

      <hr className="divider" style={{ margin: "18px 0" }} />
      <p className="small muted" style={{ textAlign: "center" }}>
        Already have an account?{" "}
        <Link to="/signin" style={{ fontWeight: 650 }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
