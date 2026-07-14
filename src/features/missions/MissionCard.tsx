import { Check, Clock, Pencil, Trash2, TriangleAlert, Zap } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Mission } from "../../store/types";
import { CategoryBadge, DIFFICULTY_COLOR } from "../../components/ui";
import { DIFFICULTY_LABEL, DIFFICULTY_XP } from "../../lib/xp";
import { formatShort, todayISO } from "../../lib/dates";

const DONE_AT_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function MissionCard({
  mission,
  onEdit,
  showCompletedAt = false,
}: {
  mission: Mission;
  onEdit: (mission: Mission) => void;
  showCompletedAt?: boolean;
}) {
  const toggleMission = useHeal((s) => s.toggleMission);
  const deleteMission = useHeal((s) => s.deleteMission);

  const overdue = !mission.done && mission.date < todayISO();
  const diffColor = DIFFICULTY_COLOR[mission.difficulty];
  const xp = DIFFICULTY_XP[mission.difficulty];

  function handleDelete() {
    if (confirm(`Delete mission "${mission.title}"? This cannot be undone.`)) {
      deleteMission(mission.id);
    }
  }

  return (
    <div
      className="card card-hover"
      style={
        overdue
          ? { borderLeft: "3px solid color-mix(in srgb, var(--danger) 75%, transparent)" }
          : undefined
      }
    >
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <button
          className={`check-circle${mission.done ? " done" : ""}`}
          onClick={() => toggleMission(mission.id)}
          aria-label={mission.done ? "Mark mission incomplete" : "Complete mission"}
          title={mission.done ? "Mark incomplete" : `Complete for +${xp} XP`}
        >
          <Check size={14} strokeWidth={3} />
        </button>

        <div className="col grow" style={{ gap: 8, minWidth: 0 }}>
          <div className="row-between" style={{ gap: 8 }}>
            <span
              className={mission.done ? "strike" : undefined}
              style={{ fontWeight: 650, fontSize: 14.5, overflowWrap: "anywhere" }}
            >
              {mission.title}
            </span>
            <div className="row" style={{ gap: 4, flexShrink: 0 }}>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => onEdit(mission)}
                aria-label="Edit mission"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={handleDelete}
                aria-label="Delete mission"
                title="Delete"
                style={{ color: "var(--danger)" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="row wrap" style={{ gap: 6 }}>
            {overdue && (
              <span
                className="chip"
                style={{
                  color: "var(--danger)",
                  borderColor: "color-mix(in srgb, var(--danger) 45%, transparent)",
                }}
              >
                <TriangleAlert size={12} />
                Overdue · {formatShort(mission.date)}
              </span>
            )}
            <span
              className="chip"
              style={{
                color: diffColor,
                borderColor: `color-mix(in srgb, ${diffColor} 40%, transparent)`,
              }}
            >
              {DIFFICULTY_LABEL[mission.difficulty]}
            </span>
            <span
              className="chip"
              style={{
                color: "var(--violet)",
                borderColor: "color-mix(in srgb, var(--violet) 40%, transparent)",
              }}
            >
              <Zap size={12} />+{xp} XP
            </span>
            <CategoryBadge category={mission.category} />
          </div>

          {mission.notes && (
            <div
              className="small muted"
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              title={mission.notes}
            >
              {mission.notes}
            </div>
          )}

          {showCompletedAt && mission.done && mission.doneAt != null && (
            <div className="row small muted" style={{ gap: 5 }}>
              <Clock size={12} />
              Completed {DONE_AT_FMT.format(mission.doneAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
