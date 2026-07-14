import { Droplets, Minus, Plus, SmilePlus, TrendingUp, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHeal } from "../../store/store";
import { xpSeries } from "../../store/selectors";
import { todayISO, formatWeekday, isToday } from "../../lib/dates";
import { EmptyState, ProgressBar } from "../../components/ui";
import {
  CHART_COLORS,
  GRID_STROKE,
  AXIS_TICK,
  AXIS_LINE,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
} from "../../lib/chartTheme";

/* ---------- Quick log: water + mood ---------- */

type Mood = 1 | 2 | 3 | 4 | 5;

const MOODS: Array<{ value: Mood; emoji: string; label: string }> = [
  { value: 1, emoji: "😞", label: "Awful" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

export function QuickLogCard() {
  const health = useHeal((s) => s.health);
  const waterTarget = useHeal((s) => s.settings.waterTarget);
  const updateHealth = useHeal((s) => s.updateHealth);
  const today = todayISO();
  const day = health[today];
  const water = day?.water ?? 0;
  const mood = day?.mood;

  return (
    <div className="card card-hover">
      <div className="card-title">
        <Droplets size={16} color="var(--cyan)" />
        Quick Log
      </div>

      {/* Water counter */}
      <div className="row" style={{ gap: 14, marginBottom: 8 }}>
        <div className="grow">
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
            {water}
            <span className="muted" style={{ fontSize: 15, fontWeight: 650 }}>
              {" "}
              / {waterTarget} glasses
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            {water >= waterTarget
              ? "Hydration target hit. Well done."
              : `${waterTarget - water} more to hit today's target.`}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => updateHealth(today, { water: Math.max(0, water - 1) })}
          disabled={water === 0}
          aria-label="Remove a glass of water"
        >
          <Minus size={16} />
        </button>
        <button
          className="btn btn-primary btn-icon"
          onClick={() => updateHealth(today, { water: water + 1 })}
          aria-label="Add a glass of water"
        >
          <Plus size={16} />
        </button>
      </div>
      <ProgressBar value={water} max={waterTarget} height={6} color="var(--cyan)" />

      <hr className="divider" />

      {/* Mood picker */}
      <div className="row-between wrap">
        <span className="small muted row" style={{ gap: 6 }}>
          <SmilePlus size={14} />
          Mood check
        </span>
        <div className="row" style={{ gap: 6 }}>
          {MOODS.map((m) => {
            const active = mood === m.value;
            return (
              <button
                key={m.value}
                className="btn btn-ghost btn-icon"
                onClick={() =>
                  updateHealth(today, { mood: active ? undefined : m.value })
                }
                aria-label={`Mood: ${m.label}`}
                aria-pressed={active}
                title={m.label}
                style={{
                  fontSize: 20,
                  transition: "all 160ms ease",
                  ...(active
                    ? {
                        background: "rgba(139, 92, 246, 0.2)",
                        boxShadow: "0 0 14px rgba(139, 92, 246, 0.35)",
                        transform: "scale(1.15)",
                      }
                    : { opacity: 0.65 }),
                }}
              >
                {m.emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- 7-day XP mini chart ---------- */

export function XpWeekCard() {
  const xpByDay = useHeal((s) => s.xpByDay);
  const data = xpSeries({ xpByDay }, 7).map((d) => ({
    ...d,
    day: isToday(d.date) ? "Today" : formatWeekday(d.date),
  }));
  const total = data.reduce((a, d) => a + d.xp, 0);

  return (
    <div className="card card-hover">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          <Zap size={16} color="var(--violet)" />
          XP — Last 7 Days
        </div>
        <span className="chip mono" style={{ color: "var(--violet)" }}>
          +{total.toLocaleString()} XP
        </span>
      </div>
      {total === 0 ? (
        <EmptyState
          icon={<TrendingUp size={26} />}
          title="No XP earned this week yet"
          hint="Clear a mission or check a habit to light this chart up."
        />
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="day"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="xp" name="XP" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((d) => (
                <Cell
                  key={d.date}
                  fill={
                    isToday(d.date) ? CHART_COLORS[0] : "rgba(139, 92, 246, 0.45)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
