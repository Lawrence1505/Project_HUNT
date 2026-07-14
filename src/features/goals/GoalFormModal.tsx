import { useEffect, useState, type FormEvent } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { useHeal } from "../../store/store";
import {
  STAT_CATEGORIES,
  STAT_LABEL,
  type Goal,
  type GoalHorizon,
  type Milestone,
  type StatCategory,
} from "../../store/types";
import { DIFFICULTY_LABEL, DIFFICULTY_XP, type Difficulty } from "../../lib/xp";
import { uid } from "../../lib/id";
import { Modal } from "../../components/ui";
import { HORIZON_ORDER, PRIORITY_META, TAB_META, type Priority } from "./meta";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

interface MilestoneRow {
  /** Preserved for existing milestones while editing. */
  id?: string;
  done: boolean;
  title: string;
}

export default function GoalFormModal({
  open,
  onClose,
  editing,
  defaultHorizon,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this goal instead of creating one. */
  editing: Goal | null;
  defaultHorizon: GoalHorizon;
}) {
  const addGoal = useHeal((s) => s.addGoal);
  const updateGoal = useHeal((s) => s.updateGoal);

  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>(defaultHorizon);
  const [category, setCategory] = useState<StatCategory>("productivity");
  const [priority, setPriority] = useState<Priority>("medium");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<MilestoneRow[]>([]);

  /* Re-seed the form every time the modal opens (create vs edit). */
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setHorizon(editing.horizon);
      setCategory(editing.category);
      setPriority(editing.priority);
      setDifficulty(editing.difficulty);
      setDeadline(editing.deadline ?? "");
      setNotes(editing.notes ?? "");
      setRows(
        editing.milestones.map((m) => ({ id: m.id, done: m.done, title: m.title }))
      );
    } else {
      setTitle("");
      setHorizon(defaultHorizon);
      setCategory("productivity");
      setPriority("medium");
      setDifficulty("medium");
      setDeadline("");
      setNotes("");
      setRows([]);
    }
  }, [open, editing, defaultHorizon]);

  const xpReward = DIFFICULTY_XP[difficulty] * 3;

  function setRowTitle(index: number, value: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, title: value } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { done: false, title: "" }]);
  }
  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    if (editing) {
      const milestones: Milestone[] = rows
        .filter((r) => r.title.trim())
        .map((r) => ({ id: r.id ?? uid(), title: r.title.trim(), done: r.done }));
      updateGoal(editing.id, {
        title: trimmed,
        horizon,
        category,
        priority,
        difficulty,
        deadline: deadline || undefined,
        notes: notes.trim() || undefined,
        milestones,
      });
    } else {
      addGoal({
        title: trimmed,
        horizon,
        category,
        priority,
        difficulty,
        deadline: deadline || undefined,
        notes: notes.trim() || undefined,
        milestones: rows.map((r) => r.title).filter((t) => t.trim()),
      });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Goal" : "New Goal"}>
      <form onSubmit={submit} className="col" style={{ gap: 14 }}>
        <div>
          <label className="label" htmlFor="goal-title">Title</label>
          <input
            id="goal-title"
            className="input"
            style={{ width: "100%" }}
            placeholder="e.g. Ship my portfolio site"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <div>
            <label className="label" htmlFor="goal-horizon">Horizon</label>
            <select
              id="goal-horizon"
              className="select"
              style={{ width: "100%" }}
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
            >
              {HORIZON_ORDER.map((h) => (
                <option key={h} value={h}>{TAB_META[h].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal-category">Category</label>
            <select
              id="goal-category"
              className="select"
              style={{ width: "100%" }}
              value={category}
              onChange={(e) => setCategory(e.target.value as StatCategory)}
            >
              {STAT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{STAT_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal-priority">Priority</label>
            <select
              id="goal-priority"
              className="select"
              style={{ width: "100%" }}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal-difficulty">Difficulty</label>
            <select
              id="goal-difficulty"
              className="select"
              style={{ width: "100%" }}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
              ))}
            </select>
            <div className="small" style={{ marginTop: 6, color: "var(--violet)", display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={14} /> Reward: +{xpReward} XP on completion
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="goal-deadline">Deadline <span className="muted">(optional)</span></label>
          <input
            id="goal-deadline"
            className="input"
            style={{ width: "100%" }}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="goal-notes">Notes</label>
          <textarea
            id="goal-notes"
            className="textarea"
            style={{ width: "100%", minHeight: 64 }}
            placeholder="Why does this goal matter? What does done look like?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <span className="label">Milestones</span>
          <div className="col" style={{ gap: 8 }}>
            {rows.map((row, i) => (
              <div className="row" style={{ gap: 8 }} key={row.id ?? `new-${i}`}>
                <input
                  className="input grow"
                  placeholder={`Milestone ${i + 1}`}
                  value={row.title}
                  onChange={(e) => setRowTitle(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (i === rows.length - 1 && row.title.trim()) addRow();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => removeRow(i)}
                  aria-label="Remove milestone"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={addRow}>
              <Plus size={14} /> Add milestone
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
            {editing ? "Save Changes" : "Create Goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
