import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHeal } from "../../store/store";
import { xpSeries } from "../../store/selectors";
import { formatShort } from "../../lib/dates";
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "../../lib/chartTheme";
import { EmptyState } from "../../components/ui";

export default function XpTrendCard() {
  const xpByDay = useHeal((s) => s.xpByDay);

  const data = useMemo(() => xpSeries({ xpByDay }, 14), [xpByDay]);
  const hasData = data.some((d) => d.xp > 0);

  return (
    <div className="card card-hover">
      <div className="card-title">
        <TrendingUp size={16} />
        XP — Last 14 Days
      </div>
      {!hasData ? (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="No XP in the last 14 days"
          hint="Knock out a mission or log a focus session to start the climb."
        />
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShort}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              labelFormatter={(label) => formatShort(String(label))}
              formatter={(value) => [`${String(value)} XP`, "Earned"]}
            />
            <Bar
              dataKey="xp"
              name="XP"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
