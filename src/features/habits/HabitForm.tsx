import { useState } from "react";
import type { FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Habit, StatCategory } from "../../store/types";
import { STAT_CATEGORIES, STAT_LABEL } from "../../store/types";
import { Modal } from "../../components/ui";

/** Curated emoji choices for habit icons. */
const EMOJIS = [
  "💪", "📖", "🧘", "💧", "🏃", "😴", "✍️", "🎯",
  "🧠", "💻", "🎸", "🥗", "☀️", "🚭", "📵", "🙏",
  "🦷", "🚿", "🧹", "💊", "🎨", "🗣️", "🌱", "⏰",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function HabitForm({
  habit,
  onClose,
}: {
  /** When provided, the form edits this habit; otherwise it creates one. */
  habit: Habit | null;
  onClose: () => void;
}) {
  const addHabit = useHeal((s) => s.addHabit);
  const updateHabit = useHeal((s) => s.updateHabit);

  const [name, setName] = useState(habit?.name ?? "");
  const [icon, setIcon] = useState(habit?.icon ?? EMOJIS[0]);
  const [category, setCategory] = useState<StatCategory>(
    habit?.category ?? "productivity"
  );
  const [schedule, setSchedule] = useState<number[]>(
    habit?.schedule ?? [...ALL_DAYS]
  );
  const [target, setTarget] = useState(habit?.target ?? 1);

  const valid = name.trim().length > 0 && schedule.length > 0;

  function toggleDay(d: number) {
    setSchedule((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b)
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (habit) {
      updateHabit(habit.id, {
        name: name.trim(),
        icon,
        category,
        schedule,
        target,
      });
    } else {
      addHabit({ name: name.trim(), icon, category, schedule, target });
    }
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={habit ? "Edit Habit" : "New Habit"}>
      <form onSubmit={submit} className="col" style={{ gap: 16 }}>
        <div>
          <label className="label" htmlFor="habit-name">
            Name
          </label>
          <input
            id="habit-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning meditation"
            autoFocus
            maxLength={60}
          />
        </div>

        <div>
          <span className="label">Icon</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
              gap: 6,
            }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`chip${icon === e ? " chip-active" : ""}`}
                onClick={() => setIcon(e)}
                aria-label={`Pick ${e}`}
                style={{
                  justifyContent: "center",
                  fontSize: 18,
                  padding: "6px 0",
                  lineHeight: 1.2,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="habit-category">
            Category
          </label>
          <select
            id="habit-category"
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as StatCategory)}
          >
            {STAT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {STAT_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">Schedule</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                type="button"
                className={`chip${schedule.includes(i) ? " chip-active" : ""}`}
                onClick={() => toggleDay(i)}
                aria-pressed={schedule.includes(i)}
              >
                {d}
              </button>
            ))}
          </div>
          {schedule.length === 0 && (
            <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>
              Pick at least one day.
            </div>
          )}
        </div>

        <div>
          <span className="label">Daily target</span>
          <div className="row" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setTarget((t) => Math.max(1, t - 1))}
              disabled={target <= 1}
              aria-label="Decrease target"
            >
              <Minus size={14} />
            </button>
            <span className="mono" style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>
              {target}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setTarget((t) => Math.min(12, t + 1))}
              disabled={target >= 12}
              aria-label="Increase target"
            >
              <Plus size={14} />
            </button>
            <span className="small muted">times per day</span>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {habit ? "Save Changes" : "Create Habit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
