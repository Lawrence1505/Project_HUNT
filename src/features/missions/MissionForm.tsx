import { useState } from "react";
import type { FormEvent } from "react";
import { Coins, Zap } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Mission, StatCategory } from "../../store/types";
import { STAT_CATEGORIES, STAT_LABEL } from "../../store/types";
import type { Difficulty } from "../../lib/xp";
import { DIFFICULTY_LABEL, DIFFICULTY_XP, coinsForXp } from "../../lib/xp";
import { todayISO } from "../../lib/dates";
import { DIFFICULTY_COLOR } from "../../components/ui";

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard", "epic"];

/**
 * Create / edit mission form. Mount with a `key` (mission id or "new") so
 * state re-initializes when switching between missions.
 */
export default function MissionForm({
  editing,
  onDone,
}: {
  editing: Mission | null;
  onDone: () => void;
}) {
  const addMission = useHeal((s) => s.addMission);
  const updateMission = useHeal((s) => s.updateMission);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [difficulty, setDifficulty] = useState<Difficulty>(editing?.difficulty ?? "medium");
  const [category, setCategory] = useState<StatCategory>(editing?.category ?? "productivity");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const xp = DIFFICULTY_XP[difficulty];
  const coins = coinsForXp(xp);
  const diffColor = DIFFICULTY_COLOR[difficulty];

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !date) return;
    const cleanNotes = notes.trim() || undefined;
    if (editing) {
      updateMission(editing.id, {
        title: trimmed,
        date,
        difficulty,
        category,
        notes: cleanNotes,
      });
    } else {
      addMission({ title: trimmed, date, difficulty, category, notes: cleanNotes });
    }
    onDone();
  }

  return (
    <form className="col" style={{ gap: 14 }} onSubmit={submit}>
      <div className="col" style={{ gap: 6 }}>
        <label className="label" htmlFor="mission-title">
          Title
        </label>
        <input
          id="mission-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finish chapter 4, hit the gym…"
          autoFocus
          required
        />
      </div>

      <div className="grid grid-2">
        <div className="col" style={{ gap: 6 }}>
          <label className="label" htmlFor="mission-date">
            Date
          </label>
          <input
            id="mission-date"
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="col" style={{ gap: 6 }}>
          <label className="label" htmlFor="mission-difficulty">
            Difficulty
          </label>
          <select
            id="mission-difficulty"
            className="select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]} · +{DIFFICULTY_XP[d]} XP
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live reward preview */}
      <div className="row wrap" style={{ gap: 6, alignItems: "center" }}>
        <span className="small muted">Reward:</span>
        <span
          className="chip"
          style={{
            color: diffColor,
            borderColor: `color-mix(in srgb, ${diffColor} 40%, transparent)`,
          }}
        >
          {DIFFICULTY_LABEL[difficulty]}
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
        <span
          className="chip"
          style={{
            color: "var(--warning)",
            borderColor: "color-mix(in srgb, var(--warning) 40%, transparent)",
          }}
        >
          <Coins size={12} />+{coins} coins
        </span>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <label className="label" htmlFor="mission-category">
          Category
        </label>
        <select
          id="mission-category"
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

      <div className="col" style={{ gap: 6 }}>
        <label className="label" htmlFor="mission-notes">
          Notes <span className="muted">(optional)</span>
        </label>
        <textarea
          id="mission-notes"
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any details, links, or context…"
          rows={3}
        />
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          {editing ? "Save Changes" : "Create Mission"}
        </button>
      </div>
    </form>
  );
}
