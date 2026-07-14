import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BarChart3, Clock, NotebookPen, Trash2 } from "lucide-react";
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
import type { StudyKind, StudySession } from "../../store/types";
import { EmptyState, SectionHeader } from "../../components/ui";
import { formatShort, formatWeekday, isToday, lastNDates } from "../../lib/dates";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "../../lib/chartTheme";
import { KIND_META, STUDY_KINDS, fmtMin } from "./shared";

const MINUTE_PRESETS = [15, 30, 45, 60] as const;

export default function StudySection() {
  const studySessions = useHeal((s) => s.studySessions);
  const addStudySession = useHeal((s) => s.addStudySession);
  const deleteStudySession = useHeal((s) => s.deleteStudySession);

  const [subject, setSubject] = useState("");
  const [preset, setPreset] = useState<number>(30);
  const [custom, setCustom] = useState("");
  const [kind, setKind] = useState<StudyKind>("course");

  const minutes = custom !== "" ? Number(custom) : preset;
  const canLog = subject.trim().length > 0 && Number.isFinite(minutes) && minutes > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canLog) return;
    addStudySession({ minutes: Math.round(minutes), subject: subject.trim(), kind });
    setSubject("");
    setCustom("");
  };

  const chartData = useMemo(() => {
    const days = lastNDates(7);
    const byDay = new Map<string, number>(days.map((d) => [d, 0]));
    for (const s of studySessions) {
      const cur = byDay.get(s.date);
      if (cur !== undefined) byDay.set(s.date, cur + s.minutes);
    }
    return days.map((d) => ({
      day: isToday(d) ? "Today" : formatWeekday(d),
      minutes: byDay.get(d) ?? 0,
    }));
  }, [studySessions]);

  const weekTotal = useMemo(
    () => chartData.reduce((sum, d) => sum + d.minutes, 0),
    [chartData]
  );

  const kindTotals = useMemo(() => {
    const totals = new Map<StudyKind, number>();
    for (const s of studySessions) totals.set(s.kind, (totals.get(s.kind) ?? 0) + s.minutes);
    return STUDY_KINDS.filter((k) => (totals.get(k) ?? 0) > 0).map((k) => ({
      kind: k,
      total: totals.get(k) ?? 0,
    }));
  }, [studySessions]);

  const recent = useMemo(() => studySessions.slice(0, 10), [studySessions]);

  const removeSession = (s: StudySession) => {
    if (window.confirm(`Delete the ${s.minutes} min "${s.subject}" session?`))
      deleteStudySession(s.id);
  };

  return (
    <section>
      <SectionHeader title="Study Log" />

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Log a session</div>
          <form className="col" onSubmit={submit}>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What did you study?"
              />
            </div>
            <div>
              <label className="label">Minutes</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {MINUTE_PRESETS.map((m) => {
                  const active = custom === "" && preset === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`chip${active ? " chip-active" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setPreset(m);
                        setCustom("");
                      }}
                    >
                      {m}m
                    </button>
                  );
                })}
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Custom"
                  aria-label="Custom minutes"
                  style={{ width: 96 }}
                />
              </div>
            </div>
            <div>
              <label className="label">Kind</label>
              <select
                className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value as StudyKind)}
              >
                {STUDY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_META[k].label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={!canLog}>
              <NotebookPen size={16} /> Log session
            </button>
          </form>
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="card-title">This week</div>
            <span className="chip mono" style={{ color: "var(--violet)" }}>
              <Clock size={12} /> {fmtMin(weekTotal)}
            </span>
          </div>
          {weekTotal === 0 ? (
            <EmptyState
              icon={<BarChart3 size={28} />}
              title="No study time yet this week"
              hint="Log a session — even 15 focused minutes moves the bar."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
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
                />
                <Bar
                  dataKey="minutes"
                  name="Minutes"
                  unit=" min"
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row-between wrap" style={{ marginBottom: 12, gap: 10 }}>
          <div className="card-title">Recent sessions</div>
          {kindTotals.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {kindTotals.map(({ kind: k, total }) => {
                const meta = KIND_META[k];
                const Icon = meta.icon;
                return (
                  <span
                    key={k}
                    className="chip"
                    style={{
                      color: meta.color,
                      borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)`,
                    }}
                  >
                    <Icon size={12} /> {meta.label} · {fmtMin(total)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<NotebookPen size={28} />}
            title="No study sessions logged"
            hint="Every minute you log earns Knowledge XP. Start with the form above — future you says thanks."
          />
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {recent.map((s) => {
              const meta = KIND_META[s.kind];
              const Icon = meta.icon;
              return (
                <div
                  key={s.id}
                  className="row-between"
                  style={{
                    gap: 10,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div className="row grow" style={{ gap: 10, minWidth: 0 }}>
                    <Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.subject}
                      </div>
                      <div className="small muted">
                        {isToday(s.date) ? "Today" : formatShort(s.date)} · {meta.label}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    <span className="chip mono">{s.minutes}m</span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeSession(s)}
                      aria-label={`Delete ${s.subject} session`}
                      title="Delete session"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
