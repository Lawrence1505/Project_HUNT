import { type ReactNode, useEffect } from "react";
import {
  Dumbbell,
  Brain,
  BookOpen,
  HeartPulse,
  Wallet,
  Users,
  Zap,
  Palette,
  Crown,
  MessageCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import type { StatCategory, Difficulty } from "../store/types";

/* ---------- category visuals ---------- */

export const CATEGORY_ICON: Record<StatCategory, LucideIcon> = {
  strength: Dumbbell,
  mind: Brain,
  knowledge: BookOpen,
  health: HeartPulse,
  finance: Wallet,
  relationships: Users,
  productivity: Zap,
  creativity: Palette,
  leadership: Crown,
  communication: MessageCircle,
};

export const CATEGORY_COLOR: Record<StatCategory, string> = {
  strength: "var(--cat-strength)",
  mind: "var(--cat-mind)",
  knowledge: "var(--cat-knowledge)",
  health: "var(--cat-health)",
  finance: "var(--cat-finance)",
  relationships: "var(--cat-relationships)",
  productivity: "var(--cat-productivity)",
  creativity: "var(--cat-creativity)",
  leadership: "var(--cat-leadership)",
  communication: "var(--cat-communication)",
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "var(--diff-easy)",
  medium: "var(--diff-medium)",
  hard: "var(--diff-hard)",
  epic: "var(--diff-epic)",
};

export function CategoryBadge({ category }: { category: StatCategory }) {
  const Icon = CATEGORY_ICON[category];
  const color = CATEGORY_COLOR[category];
  return (
    <span className="chip" style={{ color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}>
      <Icon size={12} />
      {category}
    </span>
  );
}

/* ---------- progress ---------- */

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 8,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="progress-track" style={{ height }}>
      <div
        className="progress-fill"
        style={{
          width: `${pct}%`,
          ...(color
            ? { background: color, boxShadow: `0 0 12px color-mix(in srgb, ${color} 60%, transparent)` }
            : {}),
        }}
      />
    </div>
  );
}

export function ProgressRing({
  pct,
  size = 96,
  stroke = 8,
  color = "url(#heal-ring-grad)",
  trackColor = "rgba(255,255,255,0.08)",
  children,
}: {
  pct: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="heal-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- stat tile ---------- */

export function StatTile({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-label" style={accent ? { color: accent } : undefined}>
        {icon}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/* ---------- modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 17 }}>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 650, color: "var(--text-2)", marginBottom: 4 }}>{title}</div>
      {hint && <div className="small">{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* ---------- section header ---------- */

export function SectionHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="row-between" style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 17 }}>{title}</h2>
      {action}
    </div>
  );
}
