import { useState } from "react";
import {
  Check,
  Clock,
  Flag,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useHeal } from "../../store/store";
import type { Goal } from "../../store/types";
import { DIFFICULTY_LABEL, DIFFICULTY_XP } from "../../lib/xp";
import { daysBetween, formatShort, todayISO, toISO } from "../../lib/dates";
import { CategoryBadge, DIFFICULTY_COLOR, ProgressBar } from "../../components/ui";
import { PRIORITY_META } from "./meta";

/* ---------- shared chips ---------- */

function PriorityChip({ priority }: { priority: Goal["priority"] }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="chip"
      style={{
        color: meta.color,
        borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)`,
      }}
    >
      <Flag size={12} /> {meta.label}
    </span>
  );
}

function DifficultyChip({ goal }: { goal: Goal }) {
  const color = DIFFICULTY_COLOR[goal.difficulty];
  return (
    <span
      className="chip"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      {DIFFICULTY_LABEL[goal.difficulty]} · +{DIFFICULTY_XP[goal.difficulty] * 3} XP
    </span>
  );
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const days = daysBetween(todayISO(), deadline);
  const urgent = days <= 3; // includes overdue
  const label =
    days < 0
      ? `${-days}d overdue`
      : days === 0
        ? "Due today"
        : `${days} day${days === 1 ? "" : "s"} left`;
  const color = urgent ? "var(--danger)" : "var(--text-2)";
  return (
    <span
      className="chip"
      style={{
        color,
        borderColor: urgent
          ? "color-mix(in srgb, var(--danger) 40%, transparent)"
          : undefined,
      }}
      title={`Deadline: ${formatShort(deadline)}`}
    >
      <Clock size={12} /> {formatShort(deadline)} · {label}
    </span>
  );
}

/* ---------- active goal card ---------- */

export function GoalCard({
  goal,
  onEdit,
}: {
  goal: Goal;
  onEdit: (g: Goal) => void;
}) {
  const toggleMilestone = useHeal((s) => s.toggleMilestone);
  const addMilestone = useHeal((s) => s.addMilestone);
  const completeGoal = useHeal((s) => s.completeGoal);
  const deleteGoal = useHeal((s) => s.deleteGoal);

  const [draft, setDraft] = useState("");

  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.done).length;
  const allDone = total > 0 && done === total;
  const canComplete = total === 0 || allDone;
  const xpReward = DIFFICULTY_XP[goal.difficulty] * 3;

  function submitMilestone() {
    const t = draft.trim();
    if (!t) return;
    addMilestone(goal.id, t);
    setDraft("");
  }

  function handleDelete() {
    if (confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) {
      deleteGoal(goal.id);
    }
  }

  return (
    <div className="card card-hover col" style={{ gap: 12 }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 8 }}>
        <div className="grow">
          <div className="card-title">{goal.title}</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <PriorityChip priority={goal.priority} />
            <CategoryBadge category={goal.category} />
            <DifficultyChip goal={goal} />
            {goal.deadline && <DeadlineChip deadline={goal.deadline} />}
          </div>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onEdit(goal)}
            aria-label="Edit goal"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleDelete}
            aria-label="Delete goal"
            title="Delete"
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {goal.notes && (
        <p className="small muted" style={{ lineHeight: 1.5 }}>{goal.notes}</p>
      )}

      {total > 0 ? (
        <div className="col" style={{ gap: 8 }}>
          <div className="row-between small">
            <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <ListChecks size={14} /> Milestones
            </span>
            <span className="mono" style={{ color: allDone ? "var(--success)" : "var(--text-2)" }}>
              {done}/{total}
            </span>
          </div>
          <ProgressBar
            value={done}
            max={total}
            color={allDone ? "var(--success)" : undefined}
            height={6}
          />
          <div className="col" style={{ gap: 6, marginTop: 2 }}>
            {goal.milestones.map((m) => (
              <div className="row" style={{ gap: 10 }} key={m.id}>
                <button
                  className={`check-circle${m.done ? " done" : ""}`}
                  onClick={() => toggleMilestone(goal.id, m.id)}
                  aria-label={m.done ? "Mark milestone as not done" : "Mark milestone as done"}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <span className={`small${m.done ? " strike" : ""}`} style={{ paddingTop: 4 }}>
                  {m.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="small muted">No milestones — add steps below, or complete it in one strike.</p>
      )}

      <div className="row" style={{ gap: 8 }}>
        <input
          className="input grow"
          style={{ padding: "6px 12px", fontSize: 13 }}
          placeholder="Add milestone…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitMilestone();
            }
          }}
        />
        <button
          className="btn btn-ghost btn-icon"
          onClick={submitMilestone}
          disabled={!draft.trim()}
          aria-label="Add milestone"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="divider" style={{ margin: "2px 0" }} />

      <button
        className="btn btn-primary"
        onClick={() => completeGoal(goal.id)}
        disabled={!canComplete}
        title={
          canComplete
            ? `Complete this goal for +${xpReward} XP`
            : `Finish all ${total} milestones first`
        }
      >
        <Trophy size={15} /> Complete Goal · +{xpReward} XP
      </button>
    </div>
  );
}

/* ---------- completed / archived card ---------- */

export function DoneGoalCard({ goal }: { goal: Goal }) {
  const deleteGoal = useHeal((s) => s.deleteGoal);
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.done).length;
  const xpReward = DIFFICULTY_XP[goal.difficulty] * 3;
  const completedISO = goal.completedAt ? toISO(new Date(goal.completedAt)) : null;

  function handleDelete() {
    if (confirm(`Delete "${goal.title}" from your record?`)) {
      deleteGoal(goal.id);
    }
  }

  return (
    <div className="card col" style={{ gap: 10, opacity: 0.68 }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 8 }}>
        <div className="grow">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {goal.status === "completed" ? (
              <Trophy size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
            ) : null}
            {goal.title}
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <CategoryBadge category={goal.category} />
            <DifficultyChip goal={goal} />
            {goal.status === "archived" && <span className="chip">Archived</span>}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleDelete}
          aria-label="Delete goal"
          title="Delete"
          style={{ color: "var(--danger)" }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {total > 0 && (
        <div className="small muted">
          {done}/{total} milestones cleared
        </div>
      )}

      {goal.status === "completed" && (
        <div className="row-between small">
          <span className="muted">
            {completedISO ? `Completed ${formatShort(completedISO)}` : "Completed"}
          </span>
          <span className="mono" style={{ color: "var(--success)" }}>
            +{xpReward} XP earned
          </span>
        </div>
      )}
    </div>
  );
}
