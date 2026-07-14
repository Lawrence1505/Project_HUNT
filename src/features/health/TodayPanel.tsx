import { useEffect, useState, type CSSProperties } from "react";
import {
  Droplets,
  Dumbbell,
  Footprints,
  Minus,
  Moon,
  Plus,
  Smile,
  Wind,
} from "lucide-react";
import { useHeal } from "../../store/store";
import { todayISO } from "../../lib/dates";
import { ProgressBar } from "../../components/ui";
import type { HealthDay } from "../../store/types";

/* Success glow applied to a card when its daily target is hit. */
const HIT_GLOW: CSSProperties = {
  borderColor: "color-mix(in srgb, var(--success) 50%, transparent)",
  boxShadow: "0 0 22px color-mix(in srgb, var(--success) 22%, transparent)",
};

type MoodValue = 1 | 2 | 3 | 4 | 5;

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Rough day" },
  { value: 2, emoji: "😕", label: "Not great" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

/** Number input that commits on blur / Enter, clamped + snapped to step. */
function CommitNumberInput({
  value,
  min,
  max,
  step,
  placeholder,
  ariaLabel,
  onCommit,
}: {
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  placeholder: string;
  ariaLabel: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  useEffect(() => {
    setDraft(value != null ? String(value) : "");
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    const n = Number(trimmed);
    if (trimmed === "" || Number.isNaN(n)) {
      setDraft(value != null ? String(value) : "");
      return;
    }
    const snapped = Math.round(Math.min(max, Math.max(min, n)) / step) * step;
    const rounded = Math.round(snapped * 100) / 100;
    if (rounded !== value) onCommit(rounded);
    setDraft(String(rounded));
  };

  return (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/** Pill-shaped quick-add button. */
function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ borderRadius: "var(--radius-full)" }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function TodayPanel() {
  const today = todayISO();
  const day: HealthDay | undefined = useHeal((s) => s.health[today]);
  const settings = useHeal((s) => s.settings);
  const updateHealth = useHeal((s) => s.updateHealth);
  const patch = (p: Partial<HealthDay>) => updateHealth(today, p);

  const water = day?.water ?? 0;
  const waterHit = water >= settings.waterTarget;
  const sleep = day?.sleepHours;
  const sleepHit = sleep != null && sleep >= settings.sleepTarget;
  const steps = day?.steps;
  const stepsHit = steps != null && steps >= settings.stepsTarget;
  const workout = day?.workoutMin ?? 0;
  const meditation = day?.meditationMin ?? 0;
  const moodLabel = MOODS.find((m) => m.value === day?.mood)?.label;

  return (
    <div className="grid grid-2">
      {/* ---------- Water ---------- */}
      <div className="card card-hover" style={waterHit ? HIT_GLOW : undefined}>
        <div className="card-title">
          <Droplets size={16} style={{ color: "var(--cyan)" }} />
          Water
        </div>
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
              🥛
            </span>
            <span
              style={{
                fontSize: 34,
                fontWeight: 750,
                lineHeight: 1,
                color: waterHit ? "var(--success)" : "var(--text-1)",
                transition: "color 300ms ease",
              }}
            >
              {water}
            </span>
            <span className="small muted">/ {settings.waterTarget} glasses</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => patch({ water: Math.max(0, water - 1) })}
              disabled={water === 0}
              aria-label="Remove a glass"
            >
              <Minus size={16} />
            </button>
            <button
              className="btn btn-primary btn-icon"
              onClick={() => patch({ water: water + 1 })}
              aria-label="Add a glass"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar
            value={water}
            max={settings.waterTarget}
            color={waterHit ? "var(--success)" : "var(--cyan)"}
          />
        </div>
        {waterHit && (
          <div className="small" style={{ color: "var(--success)", marginTop: 8 }}>
            Hydration quest complete ⚡
          </div>
        )}
      </div>

      {/* ---------- Mood ---------- */}
      <div className="card card-hover">
        <div className="card-title">
          <Smile size={16} style={{ color: "var(--warning)" }} />
          Mood
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {MOODS.map((m) => {
            const selected = day?.mood === m.value;
            return (
              <button
                key={m.value}
                onClick={() => patch({ mood: m.value })}
                aria-label={m.label}
                aria-pressed={selected}
                style={{
                  fontSize: 26,
                  lineHeight: 1,
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "var(--radius-md)",
                  background: selected
                    ? "color-mix(in srgb, var(--violet) 22%, transparent)"
                    : "transparent",
                  border: selected
                    ? "1px solid color-mix(in srgb, var(--violet) 60%, transparent)"
                    : "1px solid transparent",
                  filter: selected ? "none" : "grayscale(0.55) opacity(0.7)",
                  transform: selected ? "scale(1.15)" : "scale(1)",
                  transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {m.emoji}
              </button>
            );
          })}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          {moodLabel ?? "How are you feeling today?"}
        </div>
      </div>

      {/* ---------- Sleep ---------- */}
      <div className="card card-hover" style={sleepHit ? HIT_GLOW : undefined}>
        <div className="card-title">
          <Moon size={16} style={{ color: "var(--violet)" }} />
          Sleep
        </div>
        <div className="row-between" style={{ gap: 12 }}>
          <div>
            <span
              style={{
                fontSize: 30,
                fontWeight: 750,
                lineHeight: 1,
                color: sleepHit ? "var(--success)" : "var(--text-1)",
              }}
            >
              {sleep ?? "–"}
            </span>
            <span className="small muted"> / {settings.sleepTarget}h</span>
          </div>
          <div style={{ width: 120 }}>
            <CommitNumberInput
              value={sleep}
              min={0}
              max={14}
              step={0.5}
              placeholder="hours"
              ariaLabel="Hours slept"
              onCommit={(n) => patch({ sleepHours: n })}
            />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar
            value={sleep ?? 0}
            max={settings.sleepTarget}
            color={sleepHit ? "var(--success)" : "var(--violet)"}
          />
        </div>
      </div>

      {/* ---------- Steps ---------- */}
      <div className="card card-hover" style={stepsHit ? HIT_GLOW : undefined}>
        <div className="card-title">
          <Footprints size={16} style={{ color: "var(--blue)" }} />
          Steps
        </div>
        <div className="row-between" style={{ gap: 12 }}>
          <div>
            <span
              style={{
                fontSize: 30,
                fontWeight: 750,
                lineHeight: 1,
                color: stepsHit ? "var(--success)" : "var(--text-1)",
              }}
            >
              {steps != null ? steps.toLocaleString() : "–"}
            </span>
            <span className="small muted">
              {" "}
              / {settings.stepsTarget.toLocaleString()}
            </span>
          </div>
          <div style={{ width: 120 }}>
            <CommitNumberInput
              value={steps}
              min={0}
              max={200000}
              step={100}
              placeholder="steps"
              ariaLabel="Steps today"
              onCommit={(n) => patch({ steps: n })}
            />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar
            value={steps ?? 0}
            max={settings.stepsTarget}
            color={stepsHit ? "var(--success)" : "var(--blue)"}
          />
        </div>
      </div>

      {/* ---------- Workout ---------- */}
      <div className="card card-hover">
        <div className="card-title">
          <Dumbbell size={16} style={{ color: "var(--cat-strength)" }} />
          Workout
        </div>
        <div>
          <span style={{ fontSize: 30, fontWeight: 750, lineHeight: 1 }}>
            {workout}
          </span>
          <span className="small muted"> min today</span>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[15, 30, 45, 60].map((m) => (
            <QuickChip
              key={m}
              label={`+${m} min`}
              onClick={() => patch({ workoutMin: workout + m })}
            />
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          First session of the day earns Strength XP.
        </div>
      </div>

      {/* ---------- Meditation ---------- */}
      <div className="card card-hover">
        <div className="card-title">
          <Wind size={16} style={{ color: "var(--cyan)" }} />
          Meditation
        </div>
        <div>
          <span style={{ fontSize: 30, fontWeight: 750, lineHeight: 1 }}>
            {meditation}
          </span>
          <span className="small muted"> min today</span>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[5, 10, 20].map((m) => (
            <QuickChip
              key={m}
              label={`+${m} min`}
              onClick={() => patch({ meditationMin: meditation + m })}
            />
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          Box breathing: inhale 4s · hold 4s · exhale 4s · hold 4s.
        </div>
      </div>
    </div>
  );
}
