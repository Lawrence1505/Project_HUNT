import {
  BookOpen,
  Gauge,
  HeartPulse,
  Repeat,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHeal } from "../../store/store";
import { lifeScores } from "../../store/selectors";
import type { LifeScores } from "../../store/selectors";
import { ProgressBar } from "../../components/ui";

interface ScoreDef {
  key: keyof LifeScores;
  label: string;
  icon: LucideIcon;
  color: string;
}

const SCORES: ScoreDef[] = [
  { key: "life", label: "Life Score", icon: Gauge, color: "var(--violet)" },
  { key: "discipline", label: "Discipline", icon: Repeat, color: "var(--blue)" },
  { key: "health", label: "Health", icon: HeartPulse, color: "var(--cat-health)" },
  { key: "productivity", label: "Productivity", icon: Zap, color: "var(--cat-productivity)" },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, color: "var(--cat-knowledge)" },
  { key: "finance", label: "Finance", icon: Wallet, color: "var(--cat-finance)" },
  { key: "focus", label: "Focus Today", icon: Timer, color: "var(--cyan)" },
];

function ScoreTile({ def, value }: { def: ScoreDef; value: number }) {
  const prominent = def.key === "life";
  const Icon = def.icon;
  return (
    <div className={`stat-tile${prominent ? " card-accent" : ""}`}>
      <div className="stat-label" style={{ color: def.color }}>
        <Icon size={14} />
        {def.label}
      </div>
      <div className="stat-value">
        {prominent ? (
          <span className="gradient-text" style={{ fontSize: 30 }}>
            {value}
          </span>
        ) : (
          value
        )}
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
          {" "}
          /100
        </span>
      </div>
      <ProgressBar value={value} max={100} height={4} color={def.color} />
    </div>
  );
}

export function LifeScoresRow() {
  // Life scores aggregate nearly every slice — broad subscription is
  // sanctioned for dashboards (see CONTRACT.md).
  const state = useHeal();
  const scores = lifeScores(state);

  return (
    <div className="grid grid-4">
      {SCORES.map((def) => (
        <ScoreTile key={def.key} def={def} value={scores[def.key]} />
      ))}
    </div>
  );
}
