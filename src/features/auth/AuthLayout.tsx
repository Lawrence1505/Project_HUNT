import type { ReactNode } from "react";

/** Centered glass card shell shared by the Sign In / Sign Up pages. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 32 }}>
        <div className="row" style={{ justifyContent: "center", marginBottom: 6 }}>
          <div className="brand-logo" style={{ width: 44, height: 44, fontSize: 22 }}>
            H
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="brand-name gradient-text" style={{ fontSize: 26 }}>
            HEAL
          </div>
          <div className="brand-tag" style={{ marginBottom: 14 }}>
            Heal Yourself. Level Your Life.
          </div>
          <h1 style={{ fontSize: 19 }}>{title}</h1>
          <p className="small muted" style={{ marginTop: 4 }}>
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="small"
      style={{
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
        background: "color-mix(in srgb, var(--danger) 10%, transparent)",
        color: "var(--danger)",
        marginBottom: 14,
        fontWeight: 600,
      }}
    >
      {message}
    </div>
  );
}
