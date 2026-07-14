import { Flame, Hourglass, Play, Timer, Waves, Zap } from "lucide-react";
import { useHeal } from "../../store/store";
import { focusScoreToday } from "../../store/selectors";
import { formatShort, isToday, todayISO } from "../../lib/dates";
import {
  EmptyState,
  ProgressBar,
  SectionHeader,
  StatTile,
} from "../../components/ui";
import type { FocusSession } from "../../store/types";
import TimerCard from "./TimerCard";
import { useFocusController } from "./useFocusController";

export default function FocusPage() {
  const focusSessions = useHeal((s) => s.focusSessions);
  const settings = useHeal((s) => s.settings);
  const c = useFocusController();

  const today = todayISO();
  const todaySessions = focusSessions.filter((f) => f.date === today);
  const todayMin = todaySessions.reduce((sum, f) => sum + f.minutes, 0);
  const score = focusScoreToday({ focusSessions, settings });
  const lifetimeMin = focusSessions.reduce((sum, f) => sum + f.minutes, 0);
  const pomosToday = todaySessions.filter((f) => f.mode === "pomodoro").length;
  const deepToday = todaySessions.length - pomosToday;
  const recent = focusSessions.slice(0, 10);

  return (
    <div className="page">
      <h1 className="page-title">Focus</h1>
      <p className="page-subtitle">
        Pomodoro sprints and Deep Work — every focused minute earns XP.
      </p>

      <div className="col" style={{ gap: 16 }}>
        <div className="grid grid-3">
          <StatTile
            label="Today"
            icon={<Flame size={14} />}
            accent="var(--violet)"
            value={`${todayMin}m`}
            sub={
              <div className="col" style={{ gap: 6 }}>
                <ProgressBar
                  value={todayMin}
                  max={settings.focusTarget}
                  height={6}
                />
                <span>
                  {score}% of {settings.focusTarget}m daily target
                </span>
              </div>
            }
          />
          <StatTile
            label="Sessions today"
            icon={<Zap size={14} />}
            accent="var(--cyan)"
            value={todaySessions.length}
            sub={`${pomosToday} pomodoro · ${deepToday} deep work`}
          />
          <StatTile
            label="Lifetime focus"
            icon={<Hourglass size={14} />}
            accent="var(--blue)"
            value={`${(lifetimeMin / 60).toFixed(1)}h`}
            sub={`${focusSessions.length} sessions logged`}
          />
        </div>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <TimerCard c={c} />

          <div className="card">
            <SectionHeader title="Recent sessions" />
            {recent.length === 0 ? (
              <EmptyState
                icon={<Timer size={30} />}
                title="No focus sessions yet"
                hint="Finish a Pomodoro or a 5+ minute Deep Work sprint and it will land here — with XP to match."
                action={
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => c.startMode("pomodoro")}
                  >
                    <Play size={14} /> Start a Pomodoro
                  </button>
                }
              />
            ) : (
              <div className="col" style={{ gap: 8 }}>
                {recent.map((f) => (
                  <SessionRow key={f.id} session={f} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: FocusSession }) {
  const isPomo = session.mode === "pomodoro";
  const Icon = isPomo ? Timer : Waves;
  const color = isPomo ? "var(--violet)" : "var(--cyan)";
  return (
    <div
      className="row-between card-hover"
      style={{
        padding: "9px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="row grow" style={{ gap: 10, minWidth: 0 }}>
        <span style={{ color, display: "flex", flexShrink: 0 }}>
          <Icon size={16} />
        </span>
        <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.label || (isPomo ? "Pomodoro" : "Deep Work")}
          </span>
          <span className="small muted">
            {isToday(session.date) ? "Today" : formatShort(session.date)}
          </span>
        </div>
      </div>
      <span className="chip mono" style={{ flexShrink: 0 }}>
        {session.minutes}m
      </span>
    </div>
  );
}
