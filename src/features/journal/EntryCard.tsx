import { useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { Hash, Lightbulb, Pencil, Trash2, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import type { JournalEntry } from "../../store/types";
import { Modal } from "../../components/ui";
import {
  MOODS,
  MOOD_EMOJI,
  MOOD_LABEL,
  TYPE_META,
  parseTags,
  timeAgo,
} from "./shared";
import type { Mood } from "./shared";

function LabeledBlock({
  label,
  color,
  icon,
  children,
}: {
  label: string;
  color?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <span
        className="label row"
        style={{ gap: 5, marginBottom: 4, ...(color ? { color } : {}) }}
      >
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

const bodyText: CSSProperties = {
  whiteSpace: "pre-wrap",
  color: "var(--text-2)",
  fontSize: 14,
  lineHeight: 1.55,
  margin: 0,
};

export default function EntryCard({ entry }: { entry: JournalEntry }) {
  const updateJournal = useHeal((s) => s.updateJournal);
  const deleteJournal = useHeal((s) => s.deleteJournal);

  const [editing, setEditing] = useState(false);
  const [gratitude, setGratitude] = useState<string[]>(["", "", ""]);
  const [text, setText] = useState("");
  const [wins, setWins] = useState("");
  const [lessons, setLessons] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [tagsRaw, setTagsRaw] = useState("");

  const meta = TYPE_META[entry.type];
  const TypeIcon = meta.icon;
  const textLabel =
    entry.type === "morning" ? "Intention" : entry.type === "night" ? "Reflection" : null;

  const openEdit = () => {
    const g = entry.gratitude ?? [];
    setGratitude([0, 1, 2].map((i) => g[i] ?? ""));
    setText(entry.text);
    setWins(entry.wins ?? "");
    setLessons(entry.lessons ?? "");
    setMood(entry.mood);
    setTagsRaw(entry.tags.join(", "));
    setEditing(true);
  };

  const saveEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const patch: Partial<JournalEntry> = { text: text.trim() };
    if (entry.type === "morning") {
      patch.gratitude = gratitude.map((g) => g.trim()).filter(Boolean);
    }
    if (entry.type === "night") {
      patch.wins = wins.trim() || undefined;
      patch.lessons = lessons.trim() || undefined;
      patch.mood = mood;
    }
    if (entry.type === "free") {
      patch.tags = parseTags(tagsRaw);
    }
    updateJournal(entry.id, patch);
    setEditing(false);
  };

  const remove = () => {
    if (window.confirm(`Delete this ${meta.label.toLowerCase()} entry? This cannot be undone.`)) {
      deleteJournal(entry.id);
    }
  };

  return (
    <div className="card card-hover col" style={{ gap: 12 }}>
      {/* header */}
      <div className="row-between" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span
            style={{
              display: "inline-flex",
              padding: 7,
              borderRadius: "var(--radius-full)",
              background: "var(--glass-strong)",
              border: "1px solid var(--glass-border)",
              color: meta.color,
            }}
          >
            <TypeIcon size={15} />
          </span>
          <span className="small" style={{ fontWeight: 650, color: meta.color }}>
            {meta.label}
          </span>
          {entry.mood != null && (
            <span
              title={MOOD_LABEL[entry.mood]}
              aria-label={`Mood: ${MOOD_LABEL[entry.mood]}`}
              style={{ fontSize: 17, lineHeight: 1 }}
            >
              {MOOD_EMOJI[entry.mood]}
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 2 }}>
          <span className="small muted" style={{ marginRight: 6, whiteSpace: "nowrap" }}>
            {timeAgo(entry.createdAt)}
          </span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={openEdit}
            aria-label="Edit entry"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            style={{ color: "var(--danger)" }}
            onClick={remove}
            aria-label="Delete entry"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* gratitude */}
      {entry.gratitude && entry.gratitude.length > 0 && (
        <LabeledBlock label="Grateful for">
          <ul style={{ margin: 0, paddingLeft: 20 }} className="col">
            {entry.gratitude.map((g, i) => (
              <li key={i} style={{ ...bodyText, marginBottom: 2 }}>
                {g}
              </li>
            ))}
          </ul>
        </LabeledBlock>
      )}

      {/* wins / lessons */}
      {entry.wins && (
        <LabeledBlock label="Wins" color="var(--success)" icon={<Trophy size={12} />}>
          <p style={bodyText}>{entry.wins}</p>
        </LabeledBlock>
      )}
      {entry.lessons && (
        <LabeledBlock label="Lessons" color="var(--warning)" icon={<Lightbulb size={12} />}>
          <p style={bodyText}>{entry.lessons}</p>
        </LabeledBlock>
      )}

      {/* main text */}
      {entry.text &&
        (textLabel ? (
          <LabeledBlock label={textLabel}>
            <p style={bodyText}>{entry.text}</p>
          </LabeledBlock>
        ) : (
          <p style={bodyText}>{entry.text}</p>
        ))}

      {/* tags */}
      {entry.tags.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {entry.tags.map((t) => (
            <span key={t} className="chip">
              <Hash size={11} />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${meta.label} Entry`}>
        <form onSubmit={saveEdit} className="col" style={{ gap: 14 }}>
          {entry.type === "morning" && (
            <div>
              <span className="label">Grateful for</span>
              <div className="col" style={{ gap: 8 }}>
                {gratitude.map((g, i) => (
                  <input
                    key={i}
                    className="input"
                    placeholder={`${i + 1}. I'm grateful for…`}
                    value={g}
                    onChange={(e) =>
                      setGratitude((prev) =>
                        prev.map((x, idx) => (idx === i ? e.target.value : x))
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {entry.type === "night" && (
            <>
              <div>
                <span className="label" style={{ color: "var(--success)" }}>
                  Wins
                </span>
                <textarea
                  className="textarea"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                />
              </div>
              <div>
                <span className="label" style={{ color: "var(--warning)" }}>
                  Lessons
                </span>
                <textarea
                  className="textarea"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <span className="label">
              {entry.type === "morning"
                ? "What would make today great?"
                : entry.type === "night"
                  ? "Reflection"
                  : "Entry"}
            </span>
            <textarea
              className="textarea"
              style={entry.type === "free" ? { minHeight: 140 } : undefined}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {entry.type === "night" && (
            <div>
              <span className="label">Mood</span>
              <div className="row wrap" style={{ gap: 8 }}>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={mood === m ? "chip chip-active" : "chip"}
                    style={{ cursor: "pointer", fontSize: 16, padding: "5px 12px" }}
                    title={MOOD_LABEL[m]}
                    aria-pressed={mood === m}
                    onClick={() => setMood((prev) => (prev === m ? undefined : m))}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entry.type === "free" && (
            <div>
              <span className="label row" style={{ gap: 4 }}>
                <Hash size={12} />
                Tags
              </span>
              <input
                className="input"
                placeholder="comma, separated, tags"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
              />
            </div>
          )}

          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
