import { useState } from "react";
import {
  ArchiveRestore,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Plus,
  Repeat,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useHeal } from "../../store/store";
import type { Habit } from "../../store/types";
import {
  habitStreak,
  habitSuccessRate,
  habitsToday,
} from "../../store/selectors";
import { EmptyState, SectionHeader, StatTile } from "../../components/ui";
import HabitCard, { strengthColor } from "./HabitCard";
import HabitForm from "./HabitForm";

export default function HabitsPage() {
  const habits = useHeal((s) => s.habits);
  const updateHabit = useHeal((s) => s.updateHabit);
  const deleteHabit = useHeal((s) => s.deleteHabit);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  const due = habitsToday({ habits });
  const dueDone = due.filter((x) => x.done).length;
  const bestStreak =
    active.length > 0 ? Math.max(...active.map((h) => habitStreak(h))) : 0;
  const avgRate =
    active.length > 0
      ? Math.round(
          (active.reduce((a, h) => a + habitSuccessRate(h, 30), 0) /
            active.length) *
            100
        )
      : 0;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(h: Habit) {
    setEditing(h);
    setFormOpen(true);
  }

  function removeArchived(h: Habit) {
    if (window.confirm(`Delete "${h.name}"? Its entire history will be lost.`)) {
      deleteHabit(h.id);
    }
  }

  return (
    <div className="page">
      <div className="row-between wrap" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Habits</h1>
          <p className="page-subtitle">
            Small reps, repeated daily, forge unbreakable streaks.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> New Habit
        </button>
      </div>

      {active.length > 0 ? (
        <>
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <StatTile
              label="Due Today"
              value={due.length > 0 ? `${dueDone}/${due.length}` : "—"}
              sub={due.length > 0 ? "habits completed" : "rest day"}
              icon={<CalendarCheck size={14} />}
              accent="var(--violet)"
            />
            <StatTile
              label="Best Streak"
              value={bestStreak}
              sub="days in a row"
              icon={<Flame size={14} />}
              accent="#fb923c"
            />
            <StatTile
              label="Avg Strength"
              value={`${avgRate}%`}
              sub="30-day success rate"
              icon={<TrendingUp size={14} />}
              accent={strengthColor(avgRate)}
            />
          </div>

          <div className="grid grid-auto">
            {active.map((h) => (
              <HabitCard key={h.id} habit={h} onEdit={openEdit} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Repeat size={28} />}
          title="Build your first habit"
          hint="Pick one tiny action — meditate, read, hydrate — and show up every scheduled day. Streaks do the rest."
          action={
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> New Habit
            </button>
          }
        />
      )}

      {archived.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <SectionHeader
            title={
              <span className="muted">Archived ({archived.length})</span>
            }
            action={
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowArchived((v) => !v)}
              >
                {showArchived ? "Hide" : "Show"}
                {showArchived ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            }
          />
          {showArchived && (
            <div className="col" style={{ gap: 8 }}>
              {archived.map((h) => (
                <div
                  key={h.id}
                  className="card row-between"
                  style={{ padding: "10px 16px" }}
                >
                  <div className="row grow" style={{ gap: 10, opacity: 0.65, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>{h.icon}</span>
                    <span
                      className="muted"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.name}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => updateHabit(h.id, { archived: false })}
                      title="Restore habit"
                    >
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => removeArchived(h)}
                      title="Delete habit"
                      aria-label="Delete habit"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <HabitForm
          habit={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
