import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Footprints, Moon, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useHeal } from "../../store/store";
import { formatShort, lastNDates, todayISO } from "../../lib/dates";
import { EmptyState, Modal } from "../../components/ui";
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "../../lib/chartTheme";

/* Fixed-order series colors from the validated chart palette. */
const SLEEP_COLOR = "#8b5cf6"; // violet
const STEPS_COLOR = "#0284c7"; // blue
const WEIGHT_COLOR = "#059669"; // green

const TOOLTIP_PROPS = {
  contentStyle: TOOLTIP_STYLE,
  labelStyle: TOOLTIP_LABEL_STYLE,
  itemStyle: TOOLTIP_ITEM_STYLE,
  cursor: { fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.15)" },
} as const;

function ChartCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card card-hover">
      <div className="card-title">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function TrendCharts() {
  const health = useHeal((s) => s.health);
  const settings = useHeal((s) => s.settings);
  const updateHealth = useHeal((s) => s.updateHealth);
  const today = todayISO();

  const [weightOpen, setWeightOpen] = useState(false);
  const [kgDraft, setKgDraft] = useState("");

  /* ---------- data ---------- */
  const days14 = lastNDates(14);
  const sleepData = days14.map((d) => ({
    label: formatShort(d),
    hours: health[d]?.sleepHours ?? null,
  }));
  const hasSleep = sleepData.some((p) => p.hours != null);

  const stepsData = days14.map((d) => ({
    label: formatShort(d),
    steps: health[d]?.steps ?? null,
  }));
  const hasSteps = stepsData.some((p) => p.steps != null);

  const weightData = Object.entries(health)
    .flatMap(([date, d]) =>
      d.weightKg != null ? [{ date, label: formatShort(date), kg: d.weightKg }] : []
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-60);
  const latest = weightData.length > 0 ? weightData[weightData.length - 1] : null;
  const previous = weightData.length > 1 ? weightData[weightData.length - 2] : null;
  const delta = latest && previous ? latest.kg - previous.kg : null;
  const todayWeight = health[today]?.weightKg;

  /* ---------- weight actions ---------- */
  const openWeightModal = () => {
    setKgDraft(todayWeight != null ? String(todayWeight) : latest ? String(latest.kg) : "");
    setWeightOpen(true);
  };

  const saveWeight = () => {
    const n = Number(kgDraft.trim());
    if (kgDraft.trim() === "" || Number.isNaN(n) || n <= 0) return;
    const rounded = Math.round(Math.min(400, Math.max(20, n)) * 10) / 10;
    updateHealth(today, { weightKg: rounded });
    setWeightOpen(false);
  };

  const removeTodayWeight = () => {
    if (!window.confirm("Remove today's weight entry? This cannot be undone.")) return;
    updateHealth(today, { weightKg: undefined });
    setWeightOpen(false);
  };

  return (
    <div className="grid grid-2">
      {/* ---------- Sleep line ---------- */}
      <ChartCard
        icon={<Moon size={16} style={{ color: SLEEP_COLOR }} />}
        title="Sleep — last 14 days"
      >
        {hasSleep ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sleepData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                width={34}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax), settings.sleepTarget + 1)]}
              />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={(value) => [`${String(value)} h`, "Sleep"]}
              />
              <ReferenceLine
                y={settings.sleepTarget}
                stroke="rgba(255,255,255,0.28)"
                strokeDasharray="5 4"
                label={{
                  value: `target ${settings.sleepTarget}h`,
                  fill: "#7d7d99",
                  fontSize: 11,
                  position: "insideTopRight",
                }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                name="Sleep (h)"
                stroke={SLEEP_COLOR}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: SLEEP_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={<Moon size={22} />}
            title="Log your first night of sleep"
            hint="Enter hours in the Today panel and your trend appears here."
          />
        )}
      </ChartCard>

      {/* ---------- Steps bars ---------- */}
      <ChartCard
        icon={<Footprints size={16} style={{ color: STEPS_COLOR }} />}
        title="Steps — last 14 days"
      >
        {hasSteps ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stepsData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                width={34}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={(value) => [Number(value).toLocaleString(), "Steps"]}
              />
              <Bar
                dataKey="steps"
                name="Steps"
                fill={STEPS_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={<Footprints size={22} />}
            title="No steps logged yet"
            hint="Track a day of steps to raise your first bar."
          />
        )}
      </ChartCard>

      {/* ---------- Weight line ---------- */}
      <ChartCard
        icon={<Scale size={16} style={{ color: WEIGHT_COLOR }} />}
        title={`Weight — last ${weightData.length || 60} logs`}
      >
        {weightData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weightData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                width={42}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                tickFormatter={(v: number) => Number(v).toFixed(1)}
              />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={(value) => [`${String(value)} kg`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="kg"
                name="Weight (kg)"
                stroke={WEIGHT_COLOR}
                strokeWidth={2}
                dot={
                  weightData.length <= 24
                    ? { r: 3, strokeWidth: 0, fill: WEIGHT_COLOR }
                    : false
                }
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={<Scale size={22} />}
            title="No weigh-ins yet"
            hint="Log your weight to start the 60-day trend line."
            action={
              <button className="btn btn-primary btn-sm" onClick={openWeightModal}>
                Log weight
              </button>
            }
          />
        )}
      </ChartCard>

      {/* ---------- Weigh-in card ---------- */}
      <div className="card card-hover">
        <div className="card-title">
          <Scale size={16} style={{ color: WEIGHT_COLOR }} />
          Weigh-in
        </div>
        <div className="row-between" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 750, lineHeight: 1.1 }}>
              {latest ? latest.kg.toFixed(1) : "—"}
              <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
                {" "}
                kg
              </span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              {latest ? `last logged ${formatShort(latest.date)}` : "no entries yet"}
            </div>
          </div>
          {delta != null && (
            <span
              className="chip"
              style={{ color: delta <= 0 ? "var(--success)" : "var(--warning)" }}
            >
              {delta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} kg
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={openWeightModal}>
            <Scale size={14} />
            Log weight
          </button>
          {todayWeight != null && (
            <button className="btn btn-danger btn-sm" onClick={removeTodayWeight}>
              Remove today's entry
            </button>
          )}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          Weigh in daily to build the 60-day trend.
        </div>
      </div>

      {/* ---------- Weight modal ---------- */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="Log today's weight">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveWeight();
          }}
        >
          <label className="label" htmlFor="health-weight-kg">
            Weight (kg)
          </label>
          <input
            id="health-weight-kg"
            className="input"
            type="number"
            min={20}
            max={400}
            step={0.1}
            placeholder="e.g. 72.4"
            value={kgDraft}
            onChange={(e) => setKgDraft(e.target.value)}
            autoFocus
          />
          <p className="small muted" style={{ marginTop: 8 }}>
            Saved for today, {formatShort(today)}.
          </p>
          <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            {todayWeight != null && (
              <button type="button" className="btn btn-danger" onClick={removeTodayWeight}>
                Remove entry
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setWeightOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
