import type { ISODate } from "../lib/dates";
import type { Difficulty } from "../lib/xp";

export type { ISODate, Difficulty };

/** The 10 independently-leveling life stats. */
export const STAT_CATEGORIES = [
  "strength",
  "mind",
  "knowledge",
  "health",
  "finance",
  "relationships",
  "productivity",
  "creativity",
  "leadership",
  "communication",
] as const;
export type StatCategory = (typeof STAT_CATEGORIES)[number];

export const STAT_LABEL: Record<StatCategory, string> = {
  strength: "Strength",
  mind: "Mind",
  knowledge: "Knowledge",
  health: "Health",
  finance: "Finance",
  relationships: "Relationships",
  productivity: "Productivity",
  creativity: "Creativity",
  leadership: "Leadership",
  communication: "Communication",
};

/* ---------- Missions (gamified tasks) ---------- */
export interface Mission {
  id: string;
  title: string;
  notes?: string;
  date: ISODate;
  difficulty: Difficulty;
  category: StatCategory;
  done: boolean;
  doneAt?: number; // epoch ms
  createdAt: number;
}

/* ---------- Habits ---------- */
export interface Habit {
  id: string;
  name: string;
  icon: string; // emoji
  category: StatCategory;
  /** Days of week the habit is scheduled: 0=Sun … 6=Sat. */
  schedule: number[];
  /** Completions needed per scheduled day (e.g. water ×8). */
  target: number;
  /** date -> completion count that day */
  log: Record<ISODate, number>;
  createdAt: number;
  archived?: boolean;
}

/* ---------- Goals ---------- */
export type GoalHorizon =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "lifetime";

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  notes?: string;
  horizon: GoalHorizon;
  category: StatCategory;
  priority: "low" | "medium" | "high";
  difficulty: Difficulty;
  deadline?: ISODate;
  milestones: Milestone[];
  status: "active" | "completed" | "archived";
  createdAt: number;
  completedAt?: number;
}

/* ---------- Journal ---------- */
export type JournalType = "morning" | "night" | "free";

export interface JournalEntry {
  id: string;
  date: ISODate;
  type: JournalType;
  mood?: 1 | 2 | 3 | 4 | 5;
  gratitude?: string[];
  wins?: string;
  lessons?: string;
  text: string;
  tags: string[];
  createdAt: number;
}

/* ---------- Focus ---------- */
export interface FocusSession {
  id: string;
  date: ISODate;
  minutes: number;
  mode: "pomodoro" | "deep";
  label?: string;
  endedAt: number;
}

/* ---------- Health ---------- */
export interface HealthDay {
  water?: number; // glasses
  sleepHours?: number;
  steps?: number;
  weightKg?: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  meditationMin?: number;
  workoutMin?: number;
}

/* ---------- Finance ---------- */
export interface Transaction {
  id: string;
  date: ISODate;
  type: "income" | "expense";
  amount: number;
  category: string; // free-form: Food, Rent, Salary…
  note?: string;
}

/* ---------- Learning ---------- */
export interface Book {
  id: string;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  status: "reading" | "finished" | "wishlist";
  highlights: string[];
  startedAt?: ISODate;
  finishedAt?: ISODate;
}

export type StudyKind = "course" | "coding" | "language" | "school" | "other";

export interface StudySession {
  id: string;
  date: ISODate;
  minutes: number;
  subject: string;
  kind: StudyKind;
}

/* ---------- UI events ---------- */
export interface Toast {
  id: string;
  kind: "xp" | "levelup" | "achievement" | "info";
  title: string;
  detail?: string;
}

/* ---------- Settings / profile ---------- */
export interface Settings {
  name: string;
  avatar: string; // emoji
  waterTarget: number; // glasses/day
  sleepTarget: number; // hours/day
  stepsTarget: number; // steps/day
  focusTarget: number; // focus minutes/day
  pomodoroMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  /** expense category -> monthly limit */
  budgets: Record<string, number>;
  currency: string; // symbol, e.g. "$", "₹"
}
