import { useMemo, useState } from "react";
import { CalendarClock, Plus, Target, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Goal, GoalHorizon } from "../../store/types";
import { DIFFICULTY_XP } from "../../lib/xp";
import { daysBetween, formatShort, todayISO } from "../../lib/dates";
import { EmptyState, StatTile } from "../../components/ui";
import { GoalCard, DoneGoalCard } from "./GoalCard";
import GoalFormModal from "./GoalFormModal";
import { PRIORITY_META, TAB_META, TAB_ORDER, type TabKey } from "./meta";

export default function GoalsPage() {
  const goals = useHeal((s) => s.goals);

  const [tab, setTab] = useState<TabKey>("weekly");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const active = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const finished = useMemo(
    () =>
      goals
        .filter((g) => g.status !== "active")
        .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)),
    [goals]
  );

  const countFor = (t: TabKey): number =>
    t === "done" ? finished.length : active.filter((g) => g.horizon === t).length;

  const visible = useMemo(() => {
    if (tab === "done") return finished;
    return active
      .filter((g) => g.horizon === tab)
      .sort((a, b) => {
        const pr = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
        if (pr !== 0) return pr;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [tab, active, finished]);

  /* ---------- summary ---------- */
  const completedCount = useMemo(
    () => goals.filter((g) => g.status === "completed").length,
    [goals]
  );
  const xpEarned = useMemo(
    () =>
      goals
        .filter((g) => g.status === "completed")
        .reduce((sum, g) => sum + DIFFICULTY_XP[g.difficulty] * 3, 0),
    [goals]
  );
  const nearest = useMemo(() => {
    const withDeadline = active.filter((g): g is Goal & { deadline: string } => !!g.deadline);
    if (withDeadline.length === 0) return null;
    return withDeadline.reduce((best, g) => (g.deadline < best.deadline ? g : best));
  }, [active]);

  const nearestDays = nearest ? daysBetween(todayISO(), nearest.deadline) : null;
  const nearestUrgent = nearestDays != null && nearestDays <= 3;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(g: Goal) {
    setEditing(g);
    setModalOpen(true);
  }

  const meta = TAB_META[tab];
  const EmptyIcon = meta.icon;

  return (
    <div className="page">
      <h1 className="page-title">Goals</h1>
      <p className="page-subtitle">
        Chart your campaigns — from weekly sprints to lifetime quests.
      </p>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <StatTile
          label="Active Goals"
          value={active.length}
          sub="across all horizons"
          icon={<Target size={14} />}
          accent="var(--violet)"
        />
        <StatTile
          label="Completed"
          value={completedCount}
          sub={xpEarned > 0 ? `+${xpEarned} XP earned` : "your trophy shelf awaits"}
          icon={<Trophy size={14} />}
          accent="var(--success)"
        />
        <StatTile
          label="Nearest Deadline"
          value={nearest ? formatShort(nearest.deadline) : "—"}
          sub={
            nearest && nearestDays != null
              ? `${
                  nearestDays < 0
                    ? `${-nearestDays}d overdue`
                    : nearestDays === 0
                      ? "due today"
                      : `${nearestDays}d left`
                } · ${nearest.title}`
              : "no deadlines set"
          }
          icon={<CalendarClock size={14} />}
          accent={nearestUrgent ? "var(--danger)" : "var(--blue)"}
        />
      </div>

      <div className="row-between wrap" style={{ gap: 12, marginBottom: 18 }}>
        <div className="tabs">
          {TAB_ORDER.map((t) => {
            const Icon = TAB_META[t].icon;
            const n = countFor(t);
            return (
              <button
                key={t}
                className={`tab${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon size={14} />
                  {TAB_META[t].label}
                  {n > 0 && <span className="mono" style={{ opacity: 0.75 }}>{n}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<EmptyIcon size={28} />}
            title={meta.emptyTitle}
            hint={meta.emptyHint}
            action={
              tab !== "done" ? (
                <button className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> Set a {TAB_META[tab].label.toLowerCase()} goal
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-auto">
          {visible.map((g) =>
            tab === "done" ? (
              <DoneGoalCard key={g.id} goal={g} />
            ) : (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} />
            )
          )}
        </div>
      )}

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultHorizon={tab === "done" ? "monthly" : (tab as GoalHorizon)}
      />
    </div>
  );
}
