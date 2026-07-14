import { BarChart3 } from "lucide-react";
import { useHeal } from "../../store/store";
import { statLevelFromXp } from "../../lib/xp";
import { STAT_CATEGORIES, STAT_LABEL } from "../../store/types";
import {
  CATEGORY_COLOR,
  CATEGORY_ICON,
  EmptyState,
  ProgressBar,
} from "../../components/ui";

export default function XpByStatCard() {
  const statXp = useHeal((s) => s.statXp);

  const maxXp = Math.max(1, ...STAT_CATEGORIES.map((k) => statXp[k] ?? 0));
  const hasData = STAT_CATEGORIES.some((k) => (statXp[k] ?? 0) > 0);

  return (
    <div className="card card-hover">
      <div className="card-title">
        <BarChart3 size={16} />
        XP by Life Stat
      </div>
      {!hasData ? (
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="No stat XP yet"
          hint="Every mission, habit and session is tagged to a life stat — complete one to start leveling it."
        />
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {STAT_CATEGORIES.map((key) => {
            const Icon = CATEGORY_ICON[key];
            const color = CATEGORY_COLOR[key];
            const xp = statXp[key] ?? 0;
            return (
              <div key={key} className="col" style={{ gap: 6 }}>
                <div className="row-between">
                  <div className="row" style={{ gap: 8, minWidth: 0 }}>
                    <Icon size={16} style={{ color, flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {STAT_LABEL[key]}
                    </span>
                    <span
                      className="chip"
                      style={{
                        color,
                        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                        flexShrink: 0,
                      }}
                    >
                      Lv {statLevelFromXp(xp)}
                    </span>
                  </div>
                  <span className="mono small muted" style={{ flexShrink: 0 }}>
                    {xp.toLocaleString()} XP
                  </span>
                </div>
                <ProgressBar value={xp} max={maxXp} color={color} height={8} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
