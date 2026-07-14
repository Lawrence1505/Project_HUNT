import { Feather, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { addDays, todayISO } from "../../lib/dates";
import type { JournalEntry, JournalType } from "../../store/types";

/* ---------- mood ---------- */

export type Mood = NonNullable<JournalEntry["mood"]>;

export const MOODS: readonly Mood[] = [1, 2, 3, 4, 5];

export const MOOD_EMOJI: Record<Mood, string> = {
  1: "😖",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "🤩",
};

export const MOOD_LABEL: Record<Mood, string> = {
  1: "Rough",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Amazing",
};

/* ---------- entry types ---------- */

export const JOURNAL_TYPES: readonly JournalType[] = ["morning", "night", "free"];

export const TYPE_META: Record<
  JournalType,
  { label: string; icon: LucideIcon; color: string; tagline: string }
> = {
  morning: {
    label: "Morning",
    icon: Sun,
    color: "var(--warning)",
    tagline: "Set the tone for the day.",
  },
  night: {
    label: "Night",
    icon: Moon,
    color: "var(--violet)",
    tagline: "Close the loop on today.",
  },
  free: {
    label: "Free",
    icon: Feather,
    color: "var(--cyan)",
    tagline: "Whatever's on your mind.",
  },
};

/* ---------- helpers ---------- */

/** Consecutive days with at least one entry, counting back from today (or yesterday). */
export function journalStreak(entries: JournalEntry[]): number {
  const days = new Set(entries.map((e) => e.date));
  let cursor = todayISO();
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** "Focus, Deep-Work , #growth" → ["focus", "deep-work", "growth"] */
export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean)
    )
  );
}

/** Compact relative timestamp for entry cards. */
export function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Case-insensitive search across text, wins, lessons and gratitude lines. */
export function matchesSearch(e: JournalEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.text, e.wins ?? "", e.lessons ?? "", ...(e.gratitude ?? [])]
    .join("\n")
    .toLowerCase()
    .includes(q);
}
