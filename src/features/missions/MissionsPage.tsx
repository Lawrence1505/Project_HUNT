import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Plus,
  ScrollText,
  Swords,
  Trophy,
} from "lucide-react";
import { useHeal } from "../../store/store";
import type { ISODate, Mission } from "../../store/types";
import { todayMissionProgress } from "../../store/selectors";
import { formatFull, isToday, todayISO } from "../../lib/dates";
import { EmptyState, Modal, ProgressBar } from "../../components/ui";
import MissionCard from "./MissionCard";
import MissionForm from "./MissionForm";

type Tab = "today" | "upcoming" | "completed" | "all";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

/** Group missions by date; undone before done inside each group. */
function groupByDate(list: Mission[], dir: "asc" | "desc"): Array<[ISODate, Mission[]]> {
  const map = new Map<ISODate, Mission[]>();
  for (const m of list) {
    const arr = map.get(m.date);
    if (arr) arr.push(m);
    else map.set(m.date, [m]);
  }
  const keys = [...map.keys()].sort((a, b) =>
    dir === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
  return keys.map((k) => {
    const arr = map.get(k) ?? [];
    arr.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);
    return [k, arr];
  });
}

export default function MissionsPage() {
  const missions = useHeal((s) => s.missions);

  const [tab, setTab] = useState<Tab>("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);

  const today = todayISO();

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(mission: Mission) {
    setEditing(mission);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const progress = useMemo(() => todayMissionProgress({ missions }), [missions]);

  /* Today: overdue first (oldest → newest), then today's open, then today's done. */
  const todayList = useMemo(() => {
    const overdue = missions
      .filter((m) => !m.done && m.date < today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    const due = missions.filter((m) => m.date === today);
    const open = due.filter((m) => !m.done).sort((a, b) => a.createdAt - b.createdAt);
    const done = due
      .filter((m) => m.done)
      .sort((a, b) => (a.doneAt ?? a.createdAt) - (b.doneAt ?? b.createdAt));
    return [...overdue, ...open, ...done];
  }, [missions, today]);

  const upcomingGroups = useMemo(
    () => groupByDate(missions.filter((m) => m.date > today), "asc"),
    [missions, today],
  );

  const completedList = useMemo(
    () =>
      missions
        .filter((m) => m.done)
        .sort((a, b) => (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt)),
    [missions],
  );

  const allGroups = useMemo(() => groupByDate(missions, "desc"), [missions]);

  const tabCounts: Record<Tab, number> = {
    today: todayList.length,
    upcoming: upcomingGroups.reduce((n, [, list]) => n + list.length, 0),
    completed: completedList.length,
    all: missions.length,
  };

  const newMissionBtn = (
    <button className="btn btn-primary" onClick={openNew}>
      <Plus size={16} />
      New Mission
    </button>
  );

  return (
    <div className="page">
      <div className="row-between wrap" style={{ gap: 12, marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Missions</h1>
          <p className="page-subtitle">
            Clear your quest log — every mission completed earns XP and coins.
          </p>
        </div>
        {newMissionBtn}
      </div>

      <div className="tabs" style={{ margin: "18px 0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {tabCounts[t.key] > 0 ? ` · ${tabCounts[t.key]}` : ""}
          </button>
        ))}
      </div>

      {/* ---------- TODAY ---------- */}
      {tab === "today" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="small muted">Today&apos;s progress</span>
              <span className="small mono">
                {progress.done}/{progress.total} · {progress.pct}%
              </span>
            </div>
            <ProgressBar value={progress.pct} />
          </div>

          {todayList.length === 0 ? (
            <EmptyState
              icon={<Swords size={28} />}
              title="No missions for today"
              hint="A hunter without quests gains no XP. Add your first mission for today."
              action={newMissionBtn}
            />
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {todayList.map((m) => (
                <MissionCard key={m.id} mission={m} onEdit={openEdit} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- UPCOMING ---------- */}
      {tab === "upcoming" &&
        (upcomingGroups.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={28} />}
            title="Nothing on the horizon"
            hint="Plan ahead — schedule missions for the days to come."
            action={newMissionBtn}
          />
        ) : (
          <div className="col" style={{ gap: 4 }}>
            {upcomingGroups.map(([date, list]) => (
              <div key={date}>
                <div className="row" style={{ gap: 8, margin: "14px 0 10px", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{formatFull(date)}</span>
                  <span className="small muted">
                    {list.length} {list.length === 1 ? "mission" : "missions"}
                  </span>
                </div>
                <div className="col" style={{ gap: 10 }}>
                  {list.map((m) => (
                    <MissionCard key={m.id} mission={m} onEdit={openEdit} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* ---------- COMPLETED ---------- */}
      {tab === "completed" &&
        (completedList.length === 0 ? (
          <EmptyState
            icon={<Trophy size={28} />}
            title="No victories yet"
            hint="Complete your first mission and it will be recorded here."
            action={newMissionBtn}
          />
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {completedList.map((m) => (
              <MissionCard key={m.id} mission={m} onEdit={openEdit} showCompletedAt />
            ))}
          </div>
        ))}

      {/* ---------- ALL ---------- */}
      {tab === "all" &&
        (allGroups.length === 0 ? (
          <EmptyState
            icon={<ScrollText size={28} />}
            title="Your quest log is empty"
            hint="Create a mission, pick a difficulty, and start stacking XP."
            action={newMissionBtn}
          />
        ) : (
          <div className="col" style={{ gap: 4 }}>
            {allGroups.map(([date, list]) => {
              const doneCount = list.filter((m) => m.done).length;
              return (
                <div key={date}>
                  <div className="row" style={{ gap: 8, margin: "14px 0 10px", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{formatFull(date)}</span>
                    {isToday(date) && <span className="chip chip-active">Today</span>}
                    <span className="row small muted" style={{ gap: 4 }}>
                      <CheckCircle2 size={12} />
                      {doneCount}/{list.length} done
                    </span>
                  </div>
                  <div className="col" style={{ gap: 10 }}>
                    {list.map((m) => (
                      <MissionCard key={m.id} mission={m} onEdit={openEdit} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Mission" : "New Mission"}
      >
        <MissionForm key={editing?.id ?? "new"} editing={editing} onDone={closeModal} />
      </Modal>
    </div>
  );
}
