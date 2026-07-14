import { Link } from "react-router-dom";
import { Check, Flame, Plus, Repeat, Swords } from "lucide-react";
import { useHeal } from "../../store/store";
import { habitsToday, habitStreak } from "../../store/selectors";
import { todayISO } from "../../lib/dates";
import { DIFFICULTY_XP } from "../../lib/xp";
import type { Mission } from "../../store/types";
import {
  DIFFICULTY_COLOR,
  EmptyState,
  ProgressBar,
  SectionHeader,
} from "../../components/ui";

/* ---------- Today's Missions ---------- */

function MissionRow({ mission }: { mission: Mission }) {
  const toggleMission = useHeal((s) => s.toggleMission);
  const color = DIFFICULTY_COLOR[mission.difficulty];
  return (
    <div className="row" style={{ padding: "8px 0" }}>
      <button
        className={`check-circle${mission.done ? " done" : ""}`}
        onClick={() => toggleMission(mission.id)}
        aria-label={mission.done ? "Mark incomplete" : "Complete mission"}
      >
        <Check size={14} />
      </button>
      <span
        className={`grow${mission.done ? " strike" : ""}`}
        style={{
          fontSize: 14,
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {mission.title}
      </span>
      <span
        className="chip mono"
        style={{
          color,
          borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        }}
      >
        +{DIFFICULTY_XP[mission.difficulty]} XP
      </span>
    </div>
  );
}

export function TodayMissions() {
  const missions = useHeal((s) => s.missions);
  const today = todayISO();
  const list = [...missions.filter((m) => m.date === today)].sort(
    (a, b) => Number(a.done) - Number(b.done)
  );

  return (
    <div className="card card-hover">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <Swords size={17} color="var(--violet)" />
            Today&apos;s Missions
          </span>
        }
        action={
          <Link to="/missions" className="btn btn-ghost btn-sm">
            View all →
          </Link>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<Swords size={26} />}
          title="No missions for today"
          hint="A hunter without quests grows rusty."
          action={
            <Link to="/missions" className="btn btn-primary btn-sm">
              <Plus size={14} />
              Plan today
            </Link>
          }
        />
      ) : (
        <div className="col" style={{ gap: 2 }}>
          {list.map((m) => (
            <MissionRow key={m.id} mission={m} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Habits Today ---------- */

export function TodayHabits() {
  const habits = useHeal((s) => s.habits);
  const checkHabit = useHeal((s) => s.checkHabit);
  const today = todayISO();
  const due = habitsToday({ habits });

  return (
    <div className="card card-hover">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <Repeat size={17} color="var(--blue)" />
            Habits Today
          </span>
        }
        action={
          <Link to="/habits" className="btn btn-ghost btn-sm">
            View all →
          </Link>
        }
      />
      {due.length === 0 ? (
        <EmptyState
          icon={<Repeat size={26} />}
          title="No habits scheduled today"
          hint="Small rituals, repeated daily, forge the strongest hunters."
          action={
            <Link to="/habits" className="btn btn-primary btn-sm">
              <Plus size={14} />
              Build a habit
            </Link>
          }
        />
      ) : (
        <div className="col" style={{ gap: 6 }}>
          {due.map(({ habit, count, done }) => {
            const streak = habitStreak(habit);
            return (
              <div key={habit.id} className="col" style={{ gap: 4, padding: "4px 0" }}>
                <div className="row">
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{habit.icon}</span>
                  <span
                    className={`grow${done ? " strike" : ""}`}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span
                      className="chip"
                      style={{ color: "var(--warning)" }}
                      title={`${streak}-day streak`}
                    >
                      <Flame size={12} />
                      {streak}
                    </span>
                  )}
                  <span className="small mono muted">
                    {count}/{habit.target}
                  </span>
                  <button
                    className={`check-circle${done ? " done" : ""}`}
                    onClick={() => checkHabit(habit.id, today, done ? -1 : 1)}
                    aria-label={
                      done ? `Undo ${habit.name}` : `Check ${habit.name}`
                    }
                    title={done ? "Undo one" : "Check off"}
                  >
                    <Check size={14} />
                  </button>
                </div>
                {habit.target > 1 && (
                  <ProgressBar
                    value={count}
                    max={habit.target}
                    height={4}
                    color="var(--blue)"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
