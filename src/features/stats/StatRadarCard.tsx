import { useMemo } from "react";
import { Radar as RadarIcon } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useHeal } from "../../store/store";
import { statRadar } from "../../store/selectors";
import { STAT_CATEGORIES } from "../../store/types";
import {
  AXIS_TICK,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "../../lib/chartTheme";
import { EmptyState } from "../../components/ui";

export default function StatRadarCard() {
  const statXp = useHeal((s) => s.statXp);

  const data = useMemo(() => statRadar({ statXp }), [statXp]);
  const hasData = STAT_CATEGORIES.some((k) => (statXp[k] ?? 0) > 0);

  return (
    <div className="card card-hover">
      <div className="card-title">
        <RadarIcon size={16} />
        Life Stats Radar
      </div>
      {!hasData ? (
        <EmptyState
          icon={<RadarIcon size={28} />}
          title="Your radar is still blank"
          hint="Earn XP across different categories — missions, habits, focus, learning — to shape your build."
        />
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke={GRID_STROKE} />
            <PolarAngleAxis dataKey="stat" tick={AXIS_TICK} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar
              name="Level"
              dataKey="level"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="#8b5cf6"
              fillOpacity={0.35}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
