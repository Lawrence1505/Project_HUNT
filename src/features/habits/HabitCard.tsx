import type { CSSProperties } from "react";
import { Archive, Check, Flame, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Habit, ISODate } from "../../store/types";
import {
  habitDoneOn,
  habitStreak,
  habitSuccessRate,
  isHabitDue,
} from "../../store/selectors";
import {
  formatShort,
  formatWeekday,
  lastNDates,
  todayISO,
  weekdayOf,
} from "../../lib/dates";
import { CategoryBadge, ProgressBar } from "../../components/ui";

/** Color for the "Habit Strength" bar based on 30-day success %. */
export function strengthColor(pct: number): string {
  if (pct < 40) return "var(--danger)";
  if (pct < 70) return "var(--warning)";
  return "var(--success)";
}

function WeekStrip({ habit }: { habit: Habit }) {
  const checkHabit = useHeal((s) => s.checkHabit);
  const today = todayISO();
  const days = lastNDates(7);

  function toggle(date: ISODate) {
    const count = habit.log[date] ?? 0;
    const done = habitDoneOn(habit, date);
    checkHabit(habit.id, date, done ? -count : habit.target - count);
  }

  return (
    <div className="row" style={{ gap: 5, justifyContent: "space-between" }}>
      {days.map((d) => {
        const scheduled = habit.schedule.includes(weekdayOf(d));
        const done = habitDoneOn(habit, d);
        const isTodayCell = d === today;
        const clickable = scheduled && !isTodayCell;
        const base: CSSProperties = {
          flex: 1,
          minWidth: 0,
          height: 34,
          borderRadius: "var(--radius-sm)",
          fontSize: 10.5,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 150ms ease",
          cursor: clickable ? "pointer" : "default",
        };
        const look: CSSProperties = done
          ? {
              background: "var(--grad-brand)",
              border: "1px solid transparent",
              color: "#fff",
              boxShadow: "0 0 10px rgba(139, 92, 246, 0.45)",
            }
          : scheduled
            ? {
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "var(--text-2)",
              }
            : {
                background: "transparent",
                border: "1px solid var(--glass-border)",
                color: "var(--text-3)",
                opacity: 0.35,
              };
        const ring: CSSProperties = isTodayCell
          ? { outline: "2px solid rgba(139, 92, 246, 0.55)", outlineOffset: 1 }
          : {};
        const label = scheduled
          ? done
            ? "done — click to undo"
            : isTodayCell
              ? "due today"
              : "missed — click to mark done"
          : "not scheduled";
        return (
          <button
            key={d}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && toggle(d)}
            title={`${formatShort(d)} · ${label}`}
            aria-label={`${formatShort(d)}: ${label}`}
            style={{ ...base, ...look, ...ring }}
          >
            {formatWeekday(d).charAt(0)}
          </button>
        );
      })}
    </div>
  );
}

export default function HabitCard({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: (h: Habit) => void;
}) {
  const checkHabit = useHeal((s) => s.checkHabit);
  const updateHabit = useHeal((s) => s.updateHabit);
  const deleteHabit = useHeal((s) => s.deleteHabit);

  const today = todayISO();
  const streak = habitStreak(habit);
  const pct = Math.round(habitSuccessRate(habit, 30) * 100);
  const dueToday = isHabitDue(habit, today);
  const todayCount = habit.log[today] ?? 0;
  const doneToday = habitDoneOn(habit, today);

  function remove() {
    if (window.confirm(`Delete "${habit.name}"? Its entire history will be lost.`)) {
      deleteHabit(habit.id);
    }
  }

  return (
    <div className="card card-hover col" style={{ gap: 12 }}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div className="row grow" style={{ gap: 10 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{habit.icon}</span>
          <div className="col" style={{ gap: 5, minWidth: 0 }}>
            <span
              style={{
                fontWeight: 650,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {habit.name}
            </span>
            <span>
              <CategoryBadge category={habit.category} />
            </span>
          </div>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onEdit(habit)}
            title="Edit habit"
            aria-label="Edit habit"
          >
            <Pencil size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => updateHabit(habit.id, { archived: true })}
            title="Archive habit"
            aria-label="Archive habit"
          >
            <Archive size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={remove}
            title="Delete habit"
            aria-label="Delete habit"
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 6 }}>
        <Flame
          size={15}
          style={{ color: streak > 0 ? "#fb923c" : "var(--text-3)" }}
          fill={streak > 0 ? "#fb923c" : "none"}
        />
        <span className="small" style={{ fontWeight: 650 }}>
          {streak} day{streak === 1 ? "" : "s"} streak
        </span>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <div className="row-between">
          <span className="small muted">Habit Strength</span>
          <span className="small mono" style={{ color: strengthColor(pct), fontWeight: 700 }}>
            {pct}%
          </span>
        </div>
        <ProgressBar value={pct} color={strengthColor(pct)} height={6} />
      </div>

      <WeekStrip habit={habit} />

      <div className="row-between" style={{ minHeight: 40 }}>
        <span className="small muted">
          {dueToday
            ? doneToday
              ? "Completed today"
              : "Due today"
            : "Rest day"}
        </span>
        {dueToday &&
          (habit.target === 1 ? (
            <button
              className={`check-circle${doneToday ? " done" : ""}`}
              style={{ width: 40, height: 40, minWidth: 40 }}
              onClick={() => checkHabit(habit.id, today, doneToday ? -1 : 1)}
              title={doneToday ? "Undo today" : "Mark done"}
              aria-label={doneToday ? "Undo today" : "Mark done"}
            >
              <Check size={20} />
            </button>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => checkHabit(habit.id, today, -1)}
                disabled={todayCount === 0}
                aria-label="Decrease today's count"
              >
                <Minus size={14} />
              </button>
              <span
                className="mono"
                style={{
                  fontWeight: 700,
                  minWidth: 42,
                  textAlign: "center",
                  color: doneToday ? "var(--success)" : "var(--text-1)",
                }}
              >
                {todayCount}/{habit.target}
              </span>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => checkHabit(habit.id, today, 1)}
                aria-label="Increase today's count"
              >
                <Plus size={14} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
