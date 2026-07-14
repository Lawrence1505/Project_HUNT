import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../../store/auth";
import { ApiError } from "../../lib/api";
import { AuthLayout, AuthError } from "./AuthLayout";

export default function SignInPage() {
  const signIn = useAuth((s) => s.signIn);
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Enter your email or phone, and your password");
      return;
    }
    setBusy(true);
    try {
      await signIn(identifier.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // UNVERIFIED_EMAIL / UNVERIFIED_PHONE
        setError(
          err.message ||
            "This account hasn't finished verification — complete email and phone verification to sign in."
        );
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back, Hunter" subtitle="Sign in to continue your climb.">
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="col" style={{ gap: 14 }}>
        <div>
          <label className="label" htmlFor="signin-identifier">
            Email or phone
          </label>
          <input
            id="signin-identifier"
            className="input"
            type="text"
            autoComplete="username"
            placeholder="you@example.com or +91 98765 43210"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="signin-password">
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="signin-password"
              className="input"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <Link to="/forgot" className="small" style={{ fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 4 }}>
          <LogIn size={16} />
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <hr className="divider" style={{ margin: "18px 0" }} />
      <p className="small muted" style={{ textAlign: "center" }}>
        New here?{" "}
        <Link to="/signup" style={{ fontWeight: 650 }}>
          Create your account
        </Link>{" "}
        and start at Level 1.
      </p>
    </AuthLayout>
  );
}
