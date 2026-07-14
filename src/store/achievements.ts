import { levelFromXp, statLevelFromXp } from "../lib/xp";
import { todayISO, lastNDates, monthKey } from "../lib/dates";
import type {
  Mission,
  Habit,
  Goal,
  JournalEntry,
  FocusSession,
  HealthDay,
  Transaction,
  Book,
  StudySession,
  StatCategory,
  ISODate,
} from "./types";

/** Structural slice of store state that achievement checks read. */
export interface AchievementState {
  totalXp: number;
  coins: number;
  statXp: Record<StatCategory, number>;
  xpByDay: Record<ISODate, number>;
  missions: Mission[];
  habits: Habit[];
  goals: Goal[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  health: Record<ISODate, HealthDay>;
  transactions: Transaction[];
  books: Book[];
  studySessions: StudySession[];
  settings: { waterTarget: number };
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // emoji
  tier: 1 | 2 | 3; // bronze / silver / gold — display + coin bonus
  check: (s: AchievementState) => boolean;
}

export const ACHIEVEMENT_COIN_BONUS: Record<1 | 2 | 3, number> = {
  1: 25,
  2: 100,
  3: 500,
};

/* ---- helpers ---- */

function currentStreak(xpByDay: Record<ISODate, number>): number {
  let streak = 0;
  let day = todayISO();
  // today may not have activity yet; start from yesterday if so
  if (!xpByDay[day]) {
    const dates = lastNDates(2);
    day = dates[0];
  }
  while (xpByDay[day] && xpByDay[day] > 0) {
    streak++;
    const d = new Date(day);
    d.setDate(d.getDate() - 1);
    day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return streak;
}

function doneMissions(s: AchievementState): number {
  return s.missions.filter((m) => m.done).length;
}

function bestHabitStreak(s: AchievementState): number {
  let best = 0;
  for (const h of s.habits) {
    let streak = 0;
    const dates = lastNDates(400);
    for (let i = dates.length - 1; i >= 0; i--) {
      const d = dates[i];
      if (!h.schedule.includes(new Date(d + "T00:00").getDay())) continue;
      if ((h.log[d] ?? 0) >= h.target) streak++;
      else if (d !== todayISO()) break;
    }
    best = Math.max(best, streak);
  }
  return best;
}

function totalFocusMin(s: AchievementState): number {
  return s.focusSessions.reduce((a, f) => a + f.minutes, 0);
}

/* ---- definitions ---- */

export const ACHIEVEMENTS: AchievementDef[] = [
  // Getting started
  { id: "first-mission", name: "First Blood", desc: "Complete your first mission", icon: "⚔️", tier: 1, check: (s) => doneMissions(s) >= 1 },
  { id: "first-habit", name: "Seed Planted", desc: "Create your first habit", icon: "🌱", tier: 1, check: (s) => s.habits.length >= 1 },
  { id: "first-goal", name: "North Star", desc: "Set your first goal", icon: "🎯", tier: 1, check: (s) => s.goals.length >= 1 },
  { id: "first-journal", name: "Dear Diary", desc: "Write your first journal entry", icon: "📓", tier: 1, check: (s) => s.journal.length >= 1 },
  { id: "first-focus", name: "In the Zone", desc: "Finish your first focus session", icon: "🧘", tier: 1, check: (s) => s.focusSessions.length >= 1 },
  { id: "first-book", name: "Page One", desc: "Add your first book", icon: "📖", tier: 1, check: (s) => s.books.length >= 1 },

  // Missions
  { id: "missions-10", name: "Operative", desc: "Complete 10 missions", icon: "🗡️", tier: 1, check: (s) => doneMissions(s) >= 10 },
  { id: "missions-50", name: "Veteran", desc: "Complete 50 missions", icon: "🛡️", tier: 2, check: (s) => doneMissions(s) >= 50 },
  { id: "missions-250", name: "Warlord", desc: "Complete 250 missions", icon: "👑", tier: 3, check: (s) => doneMissions(s) >= 250 },
  { id: "epic-mission", name: "Boss Slayer", desc: "Complete an epic-difficulty mission", icon: "🐉", tier: 2, check: (s) => s.missions.some((m) => m.done && m.difficulty === "epic") },
  { id: "early-bird", name: "Early Bird", desc: "Complete a mission before 7 AM", icon: "🌅", tier: 2, check: (s) => s.missions.some((m) => m.done && m.doneAt != null && new Date(m.doneAt).getHours() < 7) },
  { id: "night-owl", name: "Night Owl", desc: "Write a night journal after 10 PM", icon: "🦉", tier: 1, check: (s) => s.journal.some((j) => j.type === "night" && new Date(j.createdAt).getHours() >= 22) },

  // Streaks
  { id: "streak-7", name: "One Week Strong", desc: "7-day activity streak", icon: "🔥", tier: 1, check: (s) => currentStreak(s.xpByDay) >= 7 },
  { id: "streak-30", name: "Iron Discipline", desc: "30-day activity streak", icon: "⚙️", tier: 2, check: (s) => currentStreak(s.xpByDay) >= 30 },
  { id: "streak-100", name: "Unbreakable", desc: "100-day activity streak", icon: "💎", tier: 3, check: (s) => currentStreak(s.xpByDay) >= 100 },
  { id: "streak-365", name: "Year of Fire", desc: "365-day activity streak", icon: "☄️", tier: 3, check: (s) => currentStreak(s.xpByDay) >= 365 },
  { id: "habit-streak-7", name: "Habit Forming", desc: "7-day streak on any habit", icon: "🧬", tier: 1, check: (s) => bestHabitStreak(s) >= 7 },
  { id: "habit-streak-30", name: "Second Nature", desc: "30-day streak on any habit", icon: "🌀", tier: 2, check: (s) => bestHabitStreak(s) >= 30 },
  { id: "habit-streak-100", name: "Automated Human", desc: "100-day streak on any habit", icon: "🤖", tier: 3, check: (s) => bestHabitStreak(s) >= 100 },

  // Levels
  { id: "level-5", name: "Awakened", desc: "Reach level 5", icon: "✨", tier: 1, check: (s) => levelFromXp(s.totalXp) >= 5 },
  { id: "level-10", name: "Disciplined", desc: "Reach level 10", icon: "🥉", tier: 1, check: (s) => levelFromXp(s.totalXp) >= 10 },
  { id: "level-25", name: "Ascending", desc: "Reach level 25", icon: "🥈", tier: 2, check: (s) => levelFromXp(s.totalXp) >= 25 },
  { id: "level-50", name: "Master", desc: "Reach level 50", icon: "🥇", tier: 3, check: (s) => levelFromXp(s.totalXp) >= 50 },
  { id: "level-100", name: "Legend", desc: "Reach level 100", icon: "🏆", tier: 3, check: (s) => levelFromXp(s.totalXp) >= 100 },
  { id: "coins-1000", name: "Treasure Hoard", desc: "Hold 1,000 coins", icon: "🪙", tier: 2, check: (s) => s.coins >= 1000 },

  // Focus
  { id: "focus-25", name: "Deep Diver", desc: "Complete 25 focus sessions", icon: "🌊", tier: 2, check: (s) => s.focusSessions.length >= 25 },
  { id: "focus-100", name: "Monk Mode", desc: "Complete 100 focus sessions", icon: "⛩️", tier: 3, check: (s) => s.focusSessions.length >= 100 },
  { id: "focus-1000min", name: "Time Lord", desc: "Accumulate 1,000 focus minutes", icon: "⏳", tier: 2, check: (s) => totalFocusMin(s) >= 1000 },

  // Journal
  { id: "journal-30", name: "Chronicler", desc: "Write 30 journal entries", icon: "✒️", tier: 2, check: (s) => s.journal.length >= 30 },
  { id: "gratitude-10", name: "Grateful Heart", desc: "Log gratitude 10 times", icon: "💜", tier: 1, check: (s) => s.journal.filter((j) => (j.gratitude?.length ?? 0) > 0).length >= 10 },

  // Health
  { id: "hydrated-week", name: "Hydro Homie", desc: "Hit your water target 7 days in a row", icon: "💧", tier: 2, check: (s) => lastNDates(7).every((d) => (s.health[d]?.water ?? 0) >= s.settings.waterTarget) },
  { id: "workouts-10", name: "Fitness Freak", desc: "Log 10 workouts", icon: "💪", tier: 1, check: (s) => Object.values(s.health).filter((h) => (h.workoutMin ?? 0) > 0).length >= 10 },
  { id: "workouts-50", name: "Iron Body", desc: "Log 50 workouts", icon: "🏋️", tier: 2, check: (s) => Object.values(s.health).filter((h) => (h.workoutMin ?? 0) > 0).length >= 50 },
  { id: "meditate-10", name: "Still Mind", desc: "Meditate on 10 days", icon: "🕉️", tier: 1, check: (s) => Object.values(s.health).filter((h) => (h.meditationMin ?? 0) > 0).length >= 10 },

  // Learning
  { id: "book-finished", name: "Book Worm", desc: "Finish a book", icon: "🐛", tier: 1, check: (s) => s.books.some((b) => b.status === "finished") },
  { id: "books-10", name: "Master Learner", desc: "Finish 10 books", icon: "🎓", tier: 3, check: (s) => s.books.filter((b) => b.status === "finished").length >= 10 },
  { id: "study-1000min", name: "Scholar", desc: "Accumulate 1,000 study minutes", icon: "📚", tier: 2, check: (s) => s.studySessions.reduce((a, x) => a + x.minutes, 0) >= 1000 },
  { id: "coding-beast", name: "Coding Beast", desc: "Log 500 coding minutes", icon: "💻", tier: 2, check: (s) => s.studySessions.filter((x) => x.kind === "coding").reduce((a, x) => a + x.minutes, 0) >= 500 },

  // Finance
  { id: "budget-set", name: "Money Minded", desc: "Track 10 transactions", icon: "🧾", tier: 1, check: (s) => s.transactions.length >= 10 },
  { id: "saver", name: "Financial Guru", desc: "Save 20%+ of income in a month", icon: "🏦", tier: 2, check: (s) => {
      const byMonth = new Map<string, { inc: number; exp: number }>();
      for (const t of s.transactions) {
        const k = monthKey(t.date);
        const v = byMonth.get(k) ?? { inc: 0, exp: 0 };
        if (t.type === "income") v.inc += t.amount;
        else v.exp += t.amount;
        byMonth.set(k, v);
      }
      for (const v of byMonth.values())
        if (v.inc > 0 && (v.inc - v.exp) / v.inc >= 0.2) return true;
      return false;
    } },

  // Goals & stats
  { id: "goal-completed", name: "Dream Chaser", desc: "Complete a goal", icon: "🌠", tier: 2, check: (s) => s.goals.some((g) => g.status === "completed") },
  { id: "goals-10", name: "Visionary", desc: "Complete 10 goals", icon: "🔭", tier: 3, check: (s) => s.goals.filter((g) => g.status === "completed").length >= 10 },
  { id: "balanced-5", name: "Renaissance Soul", desc: "Reach level 5 in five different stats", icon: "🎭", tier: 3, check: (s) => Object.values(s.statXp).filter((xp) => statLevelFromXp(xp) >= 5).length >= 5 },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
