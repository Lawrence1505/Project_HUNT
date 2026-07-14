import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Hash, Save, Sparkles } from "lucide-react";
import { useHeal } from "../../store/store";
import type { JournalType } from "../../store/types";
import { SectionHeader } from "../../components/ui";
import {
  JOURNAL_TYPES,
  MOODS,
  MOOD_EMOJI,
  MOOD_LABEL,
  TYPE_META,
  parseTags,
} from "./shared";
import type { Mood } from "./shared";

/* Rotating placeholder prompts, one pool per field. */
const INTENTION_PROMPTS = [
  "Ship the thing you keep postponing…",
  "One deep-work block before noon…",
  "Move your body for 30 minutes…",
  "Tell someone you appreciate them…",
  "Finish one thing completely before starting another…",
];
const WINS_PROMPTS = [
  "What went well today, however small?",
  "A moment you're proud of…",
  "Progress you can actually point to…",
];
const LESSONS_PROMPTS = [
  "What did today teach you?",
  "What would you do differently tomorrow?",
  "A mistake worth keeping notes on…",
];
const REFLECTION_PROMPTS = [
  "Let the day settle. What remains?",
  "Describe today in three sentences…",
  "What are you carrying into tomorrow?",
];
const FREE_PROMPTS = [
  "What's on your mind?",
  "Describe a moment you want to remember…",
  "Write a letter to your future self…",
  "What are you avoiding right now — and why?",
  "If today were a chapter, what would its title be?",
];

function defaultTypeForHour(): JournalType {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return "morning";
  if (h >= 18 || h < 4) return "night";
  return "free";
}

const EMPTY_GRATITUDE = ["", "", ""];

export default function ComposeCard() {
  const addJournal = useHeal((s) => s.addJournal);

  const [type, setType] = useState<JournalType>(defaultTypeForHour());

  /* morning */
  const [gratitude, setGratitude] = useState<string[]>(EMPTY_GRATITUDE);
  const [intention, setIntention] = useState("");
  /* night */
  const [wins, setWins] = useState("");
  const [lessons, setLessons] = useState("");
  const [reflection, setReflection] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  /* free */
  const [freeText, setFreeText] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  /* rotating prompts */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 7000);
    return () => window.clearInterval(id);
  }, []);
  const prompt = (pool: string[]) => pool[tick % pool.length];

  const canSave =
    type === "morning"
      ? gratitude.some((g) => g.trim()) || intention.trim().length > 0
      : type === "night"
        ? wins.trim().length > 0 ||
          lessons.trim().length > 0 ||
          reflection.trim().length > 0
        : freeText.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (type === "morning") {
      addJournal({
        type,
        text: intention.trim(),
        gratitude: gratitude.map((g) => g.trim()).filter(Boolean),
      });
    } else if (type === "night") {
      addJournal({
        type,
        text: reflection.trim(),
        wins: wins.trim() || undefined,
        lessons: lessons.trim() || undefined,
        mood,
      });
    } else {
      addJournal({
        type,
        text: freeText.trim(),
        tags: parseTags(tagsRaw),
      });
    }
    setGratitude(EMPTY_GRATITUDE);
    setIntention("");
    setWins("");
    setLessons("");
    setReflection("");
    setMood(undefined);
    setFreeText("");
    setTagsRaw("");
    setTick((t) => t + 1); // fresh prompt for the next entry
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const setGratitudeAt = (i: number, value: string) =>
    setGratitude((prev) => prev.map((g, idx) => (idx === i ? value : g)));

  const meta = TYPE_META[type];

  return (
    <div className="card card-accent">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <meta.icon size={17} style={{ color: meta.color }} />
            New Entry
            <span className="small muted" style={{ fontWeight: 400 }}>
              {meta.tagline}
            </span>
          </span>
        }
        action={
          <div className="tabs">
            {JOURNAL_TYPES.map((t) => {
              const m = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  className={t === type ? "tab active" : "tab"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() => setType(t)}
                >
                  <m.icon size={14} />
                  {m.label}
                </button>
              );
            })}
          </div>
        }
      />

      <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="col" style={{ gap: 14 }}>
        {type === "morning" && (
          <>
            <div>
              <span className="label">Three things I'm grateful for</span>
              <div className="col" style={{ gap: 8 }}>
                {gratitude.map((g, i) => (
                  <input
                    key={i}
                    className="input"
                    placeholder={`${i + 1}. I'm grateful for…`}
                    value={g}
                    onChange={(e) => setGratitudeAt(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="label">What would make today great?</span>
              <textarea
                className="textarea"
                placeholder={prompt(INTENTION_PROMPTS)}
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
              />
            </div>
          </>
        )}

        {type === "night" && (
          <>
            <div className="grid grid-2">
              <div>
                <span className="label" style={{ color: "var(--success)" }}>
                  Wins
                </span>
                <textarea
                  className="textarea"
                  placeholder={prompt(WINS_PROMPTS)}
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
                  placeholder={prompt(LESSONS_PROMPTS)}
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                />
              </div>
            </div>
            <div>
              <span className="label">Reflection</span>
              <textarea
                className="textarea"
                placeholder={prompt(REFLECTION_PROMPTS)}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>
            <div>
              <span className="label">How was today?</span>
              <div className="row wrap" style={{ gap: 8 }}>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={mood === m ? "chip chip-active" : "chip"}
                    style={{ cursor: "pointer", fontSize: 16, padding: "5px 12px" }}
                    title={MOOD_LABEL[m]}
                    aria-label={MOOD_LABEL[m]}
                    aria-pressed={mood === m}
                    onClick={() => setMood((prev) => (prev === m ? undefined : m))}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
                {mood != null && (
                  <span className="small muted" style={{ alignSelf: "center" }}>
                    {MOOD_LABEL[mood]}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {type === "free" && (
          <>
            <div>
              <span className="label">Entry</span>
              <textarea
                className="textarea"
                style={{ minHeight: 140 }}
                placeholder={prompt(FREE_PROMPTS)}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </div>
            <div>
              <span className="label row" style={{ gap: 4 }}>
                <Hash size={12} />
                Tags
              </span>
              <input
                className="input"
                placeholder="growth, focus, family — comma separated"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="row-between wrap" style={{ gap: 10 }}>
          <span className="small muted row" style={{ gap: 6 }}>
            <Sparkles size={13} style={{ color: "var(--violet)" }} />
            +15 XP · Mind — Ctrl+Enter saves
          </span>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            <Save size={15} />
            Save Entry
          </button>
        </div>
      </form>
    </div>
  );
}
