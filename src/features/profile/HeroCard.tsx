import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CalendarDays, Check, Coins, Pencil, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import { levelProgress, rankForLevel, titleForLevel } from "../../lib/xp";
import { ACHIEVEMENTS } from "../../store/achievements";
import { ProgressRing } from "../../components/ui";
import AvatarPicker from "./AvatarPicker";

const RANK_COLOR: Record<string, string> = {
  E: "#9ca3af",
  D: "#34d399",
  C: "#38bdf8",
  B: "#8b5cf6",
  A: "#d946ef",
  S: "#fbbf24",
  SS: "#fb923c",
  SSS: "#f87171",
};

function HeroStat({
  icon,
  value,
  label,
  color,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <span
        style={{
          display: "inline-flex",
          padding: 9,
          borderRadius: "var(--radius-md)",
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          color,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.15 }}>{value}</div>
        <div className="small muted">{label}</div>
      </div>
    </div>
  );
}

export default function HeroCard() {
  const settings = useHeal((s) => s.settings);
  const totalXp = useHeal((s) => s.totalXp);
  const coins = useHeal((s) => s.coins);
  const unlocked = useHeal((s) => s.unlocked);
  const missions = useHeal((s) => s.missions);
  const habits = useHeal((s) => s.habits);
  const journal = useHeal((s) => s.journal);
  const goals = useHeal((s) => s.goals);
  const updateSettings = useHeal((s) => s.updateSettings);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const lp = levelProgress(totalXp);
  const title = titleForLevel(lp.level);
  const rank = rankForLevel(lp.level);
  const rankColor = RANK_COLOR[rank] ?? "var(--violet)";
  const unlockedCount = Object.keys(unlocked).length;

  const memberSince = useMemo(() => {
    const stamps = [
      ...missions.map((m) => m.createdAt),
      ...habits.map((h) => h.createdAt),
      ...journal.map((j) => j.createdAt),
      ...goals.map((g) => g.createdAt),
    ];
    if (stamps.length === 0) return "today";
    return new Date(Math.min(...stamps)).toLocaleDateString();
  }, [missions, habits, journal, goals]);

  const startEditName = () => {
    setNameDraft(settings.name);
    setEditingName(true);
  };
  const commitName = () => {
    const name = nameDraft.trim();
    if (name && name !== settings.name) updateSettings({ name });
    setEditingName(false);
  };
  const onNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitName();
    if (e.key === "Escape") setEditingName(false);
  };

  return (
    <div className="card card-accent">
      <div className="row wrap" style={{ gap: 24, alignItems: "center" }}>
        {/* Avatar in gradient ring */}
        <button
          onClick={() => setPickerOpen(true)}
          title="Change avatar"
          aria-label="Change avatar"
          style={{
            position: "relative",
            flexShrink: 0,
            borderRadius: "50%",
            padding: 4,
            background: "var(--grad-brand)",
            boxShadow: "var(--glow-violet)",
            transition: "transform var(--t-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              background: "var(--bg-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              lineHeight: 1,
            }}
          >
            {settings.avatar}
          </span>
          <span
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              display: "inline-flex",
              padding: 6,
              borderRadius: "50%",
              background: "var(--bg-1)",
              border: "1px solid var(--glass-border-bright)",
              color: "var(--text-2)",
            }}
          >
            <Pencil size={12} />
          </span>
        </button>

        {/* Identity */}
        <div className="grow" style={{ minWidth: 220 }}>
          {editingName ? (
            <div className="row" style={{ gap: 8, maxWidth: 340 }}>
              <input
                className="input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={onNameKey}
                onBlur={commitName}
                maxLength={24}
                autoFocus
                aria-label="Your name"
              />
              <button className="btn btn-primary btn-icon" onClick={commitName} aria-label="Save name">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 24, lineHeight: 1.2 }}>{settings.name}</h2>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={startEditName}
                title="Edit name"
                aria-label="Edit name"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}

          <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
            <span className="gradient-text" style={{ fontWeight: 700, fontSize: 15 }}>
              {title}
            </span>
            <span
              className="mono"
              style={{
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "0.1em",
                padding: "3px 14px",
                borderRadius: "var(--radius-md)",
                color: rankColor,
                background: `color-mix(in srgb, ${rankColor} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${rankColor} 45%, transparent)`,
                textShadow: `0 0 16px ${rankColor}`,
              }}
            >
              {rank}-RANK
            </span>
          </div>

          <div className="row wrap" style={{ gap: 22, marginTop: 16 }}>
            <HeroStat
              icon={<Coins size={16} />}
              value={coins.toLocaleString()}
              label="Coins"
              color="var(--warning)"
            />
            <HeroStat
              icon={<Trophy size={16} />}
              value={`${unlockedCount} / ${ACHIEVEMENTS.length}`}
              label="Achievements"
              color="var(--success)"
            />
            <HeroStat
              icon={<CalendarDays size={16} />}
              value={memberSince}
              label="Member since"
              color="var(--blue)"
            />
          </div>
        </div>

        {/* Level ring */}
        <div className="col" style={{ gap: 6, alignItems: "center", flexShrink: 0 }}>
          <ProgressRing pct={lp.pct} size={122} stroke={9}>
            <div className="mono" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {lp.level}
            </div>
            <div className="small muted" style={{ letterSpacing: "0.12em", fontSize: 10.5 }}>
              LEVEL
            </div>
          </ProgressRing>
          <div className="small mono" style={{ color: "var(--text-2)" }}>
            {lp.current.toLocaleString()} / {lp.needed.toLocaleString()} XP
          </div>
          <div className="small muted">{totalXp.toLocaleString()} XP lifetime</div>
        </div>
      </div>

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
