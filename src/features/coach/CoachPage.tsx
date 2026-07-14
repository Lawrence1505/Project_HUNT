import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Swords,
  Repeat,
  Timer,
  Droplets,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Quote,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  CircleAlert,
  CircleX,
} from "lucide-react";
import { useHeal } from "../../store/store";
import { ProgressBar } from "../../components/ui";
import { uid } from "../../lib/id";
import {
  buildWelcome,
  analyzeWeek,
  buildSchedule,
  analyzeSlipping,
  buildMotivation,
  buildWeeklyReport,
  assessBurnout,
  type CoachPayload,
  type WeekAnalysis,
  type SchedulePlan,
  type ScheduleBlock,
  type SlippingReport,
  type Motivation,
  type WeeklyReport,
  type BurnoutAssessment,
} from "./insights";

interface Message {
  id: string;
  role: "user" | "coach";
  payload: CoachPayload | { kind: "user"; text: string };
}

const ACTIONS = [
  { key: "week", label: "Analyze my week" },
  { key: "schedule", label: "Make today's schedule" },
  { key: "slipping", label: "Where am I slipping?" },
  { key: "motivate", label: "Motivate me" },
  { key: "report", label: "Weekly report" },
  { key: "burnout", label: "Detect burnout" },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

/* ================= payload renderers ================= */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row-between" style={{ padding: "5px 0" }}>
      <span className="small muted">{label}</span>
      <span style={{ fontWeight: 650, fontSize: 13.5, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function WeekCard({ data }: { data: WeekAnalysis }) {
  const Trend =
    data.pctChange === null ? Minus : data.pctChange >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    data.pctChange === null
      ? "var(--text-3)"
      : data.pctChange >= 0
        ? "var(--success)"
        : "var(--danger)";
  return (
    <div>
      <p style={{ marginBottom: 10 }}>{data.headline}</p>
      <Row
        label="XP this week"
        value={
          <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
            {data.xpThisWeek.toLocaleString()}
            <Trend size={15} color={trendColor} />
            {data.pctChange !== null && (
              <span style={{ color: trendColor }}>
                {data.pctChange >= 0 ? "+" : ""}
                {data.pctChange}%
              </span>
            )}
          </span>
        }
      />
      {data.bestDayLabel && (
        <Row label="Most productive day" value={`${data.bestDayLabel} · ${data.bestDayXp} XP`} />
      )}
      <Row
        label={`Habit completion (${data.habitDone}/${data.habitDue})`}
        value={`${data.habitPct}%`}
      />
      <ProgressBar value={data.habitPct} height={6} />
      <div style={{ height: 6 }} />
      <Row label="Focus minutes" value={data.focusMin} />
      <Row label="Missions completed" value={data.missionsDone} />
    </div>
  );
}

const BLOCK_ICON: Record<ScheduleBlock["kind"], React.ReactNode> = {
  mission: <Swords size={14} color="var(--violet)" />,
  habit: <Repeat size={14} color="var(--cyan)" />,
  focus: <Timer size={14} color="var(--blue)" />,
  water: <Droplets size={14} color="var(--info)" />,
};

function ScheduleCard({ data }: { data: SchedulePlan }) {
  return (
    <div>
      <p style={{ marginBottom: 12 }}>{data.note}</p>
      {data.blocks.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          {data.blocks.map((b) => (
            <div
              key={b.id}
              className="row"
              style={{
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                background:
                  b.kind === "water" ? "rgba(56,189,248,0.07)" : "rgba(255,255,255,0.045)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span className="mono small muted" style={{ minWidth: 88 }}>
                {b.kind === "water" ? b.start : `${b.start}–${b.end}`}
              </span>
              {BLOCK_ICON[b.kind]}
              <span style={{ fontSize: 13.5 }}>
                {b.icon ? `${b.icon} ` : ""}
                {b.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlippingCard({ data }: { data: SlippingReport }) {
  if (data.issueCount === 0)
    return (
      <p>
        I went looking for leaks and found none worth flagging — habits, budgets, sleep, and
        goals all look under control. Keep the machine running.
      </p>
    );
  return (
    <div className="col" style={{ gap: 8 }}>
      <p>
        Found {data.issueCount} area{data.issueCount > 1 ? "s" : ""} that need
        {data.issueCount === 1 ? "s" : ""} attention:
      </p>
      {data.weakestHabit && (
        <div>
          <div className="small" style={{ fontWeight: 650 }}>
            {data.weakestHabit.icon} Weakest habit: {data.weakestHabit.name} —{" "}
            {data.weakestHabit.ratePct}% over 14 days
          </div>
          <ProgressBar value={data.weakestHabit.ratePct} height={6} color="var(--danger)" />
        </div>
      )}
      {data.worstWeekday && (
        <div className="small">
          📉 <b>{data.worstWeekday.name}s</b> are your weak spot — only {data.worstWeekday.pct}%
          of habits get done.
        </div>
      )}
      {data.hotBudgets.map((b) => (
        <div className="small" key={b.category}>
          💸 <b>{b.category}</b> at {b.pct}% of budget ({data.currency}
          {b.spent.toLocaleString()} / {data.currency}
          {b.limit.toLocaleString()})
        </div>
      ))}
      {data.sleepBelow >= 2 && (
        <div className="small">
          😴 Sleep below your {data.sleepTarget}h target on {data.sleepBelow} of the last{" "}
          {data.sleepLogged} logged nights.
        </div>
      )}
      {data.staleGoals.slice(0, 3).map((g) => (
        <div className="small" key={g.title}>
          🎯 "<b>{g.title}</b>" — no milestone progress in {g.ageDays} days.
        </div>
      ))}
    </div>
  );
}

function MotivationCard({ data }: { data: Motivation }) {
  return (
    <div>
      <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
        <Quote size={18} color="var(--violet)" style={{ flexShrink: 0, marginTop: 3 }} />
        <p style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.55 }}>{data.line}</p>
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>
        {data.context}
      </div>
    </div>
  );
}

function ReportCard({ data }: { data: WeeklyReport }) {
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        Weekly report · {data.rangeLabel}
      </div>
      <Row label="XP earned" value={data.xpThisWeek.toLocaleString()} />
      <Row
        label={`Level ${data.level} — ${data.title}`}
        value={`${data.levelCurrent}/${data.levelNeeded} XP`}
      />
      <ProgressBar value={data.levelCurrent} max={data.levelNeeded} height={6} />
      <div style={{ height: 6 }} />
      {data.strongestStat && (
        <Row
          label="Strongest stat"
          value={`${data.strongestStat.label} · LV ${data.strongestStat.level}`}
        />
      )}
      <Row
        label={`Habits (${data.habitDone}/${data.habitDue})`}
        value={`${data.habitPct}%`}
      />
      {data.bestHabit && (
        <Row
          label="Most consistent habit"
          value={`${data.bestHabit.icon} ${data.bestHabit.name} · ${data.bestHabit.ratePct}%`}
        />
      )}
      <Row
        label="Focus"
        value={`${data.focusMin}/${data.focusTargetWeek} min · ${data.focusSessions} sessions`}
      />
      <Row
        label="Sleep avg (7d)"
        value={data.avgSleep !== null ? `${data.avgSleep}h vs ${data.sleepTarget}h target` : "not logged"}
      />
      <Row label="Water target days" value={`${data.waterDaysOnTarget}/7`} />
      <Row
        label="Month net"
        value={
          <span
            style={{
              color: data.netMonth.net >= 0 ? "var(--success)" : "var(--danger)",
            }}
          >
            {data.netMonth.net >= 0 ? "+" : "−"}
            {data.netMonth.currency}
            {Math.abs(data.netMonth.net).toLocaleString()}
          </span>
        }
      />
      <hr className="divider" />
      <div className="small" style={{ fontWeight: 650, marginBottom: 6 }}>
        Recommendations
      </div>
      <ol style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        {data.recommendations.map((r, i) => (
          <li key={i} className="small" style={{ color: "var(--text-2)" }}>
            {r}
          </li>
        ))}
      </ol>
    </div>
  );
}

const BURNOUT_META = {
  healthy: { label: "Healthy", color: "var(--success)", icon: <ShieldCheck size={18} /> },
  warning: { label: "Warning", color: "var(--warning)", icon: <AlertTriangle size={18} /> },
  risk: { label: "At Risk", color: "var(--danger)", icon: <Flame size={18} /> },
} as const;

const FLAG_ICON = {
  good: <CheckCircle2 size={14} color="var(--success)" />,
  warn: <CircleAlert size={14} color="var(--warning)" />,
  bad: <CircleX size={14} color="var(--danger)" />,
} as const;

function BurnoutCard({ data }: { data: BurnoutAssessment }) {
  const meta = BURNOUT_META[data.level];
  return (
    <div>
      <div
        className="row"
        style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          border: `1px solid color-mix(in srgb, ${meta.color} 45%, transparent)`,
          background: `color-mix(in srgb, ${meta.color} 9%, transparent)`,
          marginBottom: 12,
        }}
      >
        <span style={{ color: meta.color, display: "inline-flex" }}>{meta.icon}</span>
        <span style={{ fontWeight: 750 }}>
          Burnout check: <span style={{ color: meta.color }}>{meta.label}</span>
        </span>
        <span className="small muted" style={{ marginLeft: "auto" }}>
          load score {data.score}/100
        </span>
      </div>
      <div className="col" style={{ gap: 6, marginBottom: 12 }}>
        {data.factors.map((f) => (
          <div className="row-between" key={f.label}>
            <span className="row small muted" style={{ gap: 6 }}>
              {FLAG_ICON[f.flag]}
              {f.label}
            </span>
            <span className="small" style={{ fontWeight: 600 }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
      <div className="small" style={{ fontWeight: 650, marginBottom: 6 }}>
        Coach's orders
      </div>
      <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
        {data.advice.map((a, i) => (
          <li key={i} className="small" style={{ color: "var(--text-2)" }}>
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PayloadView({ payload }: { payload: CoachPayload }) {
  switch (payload.kind) {
    case "text":
      return <p>{payload.text}</p>;
    case "week":
      return <WeekCard data={payload.data} />;
    case "schedule":
      return <ScheduleCard data={payload.data} />;
    case "slipping":
      return <SlippingCard data={payload.data} />;
    case "motivate":
      return <MotivationCard data={payload.data} />;
    case "report":
      return <ReportCard data={payload.data} />;
    case "burnout":
      return <BurnoutCard data={payload.data} />;
  }
}

/* ================= page ================= */

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(0);

  useEffect(() => {
    const s = useHeal.getState();
    setMessages([
      { id: uid(), role: "coach", payload: { kind: "text", text: buildWelcome(s) } },
    ]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function run(action: ActionKey, label: string) {
    const s = useHeal.getState();
    askedRef.current += 1;
    let payload: CoachPayload;
    switch (action) {
      case "week":
        payload = { kind: "week", data: analyzeWeek(s) };
        break;
      case "schedule":
        payload = { kind: "schedule", data: buildSchedule(s) };
        break;
      case "slipping":
        payload = { kind: "slipping", data: analyzeSlipping(s) };
        break;
      case "motivate":
        payload = { kind: "motivate", data: buildMotivation(s, askedRef.current) };
        break;
      case "report":
        payload = { kind: "report", data: buildWeeklyReport(s) };
        break;
      case "burnout":
        payload = { kind: "burnout", data: assessBurnout(s) };
        break;
    }
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", payload: { kind: "user", text: label } },
      { id: uid(), role: "coach", payload },
    ]);
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <h1 className="page-title">AI Coach</h1>
      <p className="page-subtitle">
        Your on-device mentor — it reads your real numbers, not your excuses.
      </p>

      <div className="col" style={{ gap: 14, marginBottom: 20 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} style={{ alignSelf: "flex-end" }}>
              <span className="chip chip-active" style={{ fontSize: 13, padding: "7px 14px" }}>
                {(m.payload as { kind: "user"; text: string }).text}
              </span>
            </div>
          ) : (
            <div key={m.id} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  borderRadius: 10,
                  background: "var(--grad-brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "var(--glow-violet)",
                  marginTop: 2,
                }}
              >
                <Bot size={18} color="#fff" />
              </div>
              <div className="card grow" style={{ padding: 16 }}>
                <PayloadView payload={m.payload as CoachPayload} />
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="small muted" style={{ marginBottom: 10 }}>
          Quick actions
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {ACTIONS.map((a) => (
            <button key={a.key} className="btn btn-sm" onClick={() => run(a.key, a.label)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, padding: "12px 16px" }}>
        <span className="small muted">
          🔒 HEAL Coach runs 100% on-device — your data never leaves this browser. Cloud AI
          integration is on the roadmap.
        </span>
      </div>
    </div>
  );
}
