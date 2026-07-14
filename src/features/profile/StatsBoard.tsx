import { BarChart3 } from "lucide-react";
import { useHeal } from "../../store/store";
import { STAT_CATEGORIES, STAT_LABEL } from "../../store/types";
import { statLevelProgress } from "../../lib/xp";
import {
  CATEGORY_COLOR,
  CATEGORY_ICON,
  EmptyState,
  ProgressBar,
} from "../../components/ui";

export default function StatsBoard() {
  const statXp = useHeal((s) => s.statXp);

  const allZero = STAT_CATEGORIES.every((c) => (statXp[c] ?? 0) === 0);
  if (allZero) {
    return (
      <div className="card">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Your stat board is waiting"
          hint="Complete missions, keep habits, focus, read — every action levels one of your 10 life stats."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-auto">
      {STAT_CATEGORIES.map((cat) => {
        const xp = statXp[cat] ?? 0;
        const { level, pct } = statLevelProgress(xp);
        const color = CATEGORY_COLOR[cat];
        const Icon = CATEGORY_ICON[cat];
        return (
          <div key={cat} className="card card-hover" style={{ padding: 16 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    padding: 8,
                    borderRadius: "var(--radius-md)",
                    color,
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  }}
                >
                  <Icon size={16} />
                </span>
                <span style={{ fontWeight: 650, fontSize: 14 }}>{STAT_LABEL[cat]}</span>
              </div>
              <span
                className="mono"
                style={{ fontWeight: 800, fontSize: 14, color, textShadow: `0 0 12px ${color}` }}
              >
                LV {level}
              </span>
            </div>
            <ProgressBar value={pct * 100} color={color} height={6} />
            <div className="row-between" style={{ marginTop: 8 }}>
              <span className="small muted">{xp.toLocaleString()} XP</span>
              <span className="small muted mono">{Math.round(pct * 100)}% → LV {level + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
