import {
  todayISO,
  lastNDates,
  addDays,
  weekdayOf,
  monthKey,
} from "../lib/dates";
import { statLevelFromXp } from "../lib/xp";
import type { HealState } from "./store";
import type { Habit, ISODate, StatCategory } from "./types";
import { STAT_CATEGORIES, STAT_LABEL } from "./types";

/* =============== streaks =============== */

/** Consecutive days with any XP, ending today (or yesterday if today is still empty). */
export function currentStreak(s: Pick<HealState, "xpByDay">): number {
  let streak = 0;
  let day = todayISO();
  if (!s.xpByDay[day]) day = addDays(day, -1);
  while ((s.xpByDay[day] ?? 0) > 0) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(s: Pick<HealState, "xpByDay">): number {
  const days = Object.keys(s.xpByDay).sort();
  let best = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/* =============== habits =============== */

export function isHabitDue(h: Habit, date: ISODate = todayISO()): boolean {
  return !h.archived && h.schedule.includes(weekdayOf(date));
}

export function habitDoneOn(h: Habit, date: ISODate): boolean {
  return (h.log[date] ?? 0) >= h.target;
}

/** Consecutive scheduled days completed, ending today (today may be pending). */
export function habitStreak(h: Habit): number {
  let streak = 0;
  let day = todayISO();
  // Skip today if incomplete — it's still in play.
  if (isHabitDue(h, day) && !habitDoneOn(h, day)) day = addDays(day, -1);
  for (let i = 0; i < 800; i++) {
    if (h.schedule.includes(weekdayOf(day))) {
      if (habitDoneOn(h, day)) streak++;
      else break;
    }
    day = addDays(day, -1);
  }
  return streak;
}

/** Completion rate over the last n days (only counts scheduled days). */
export function habitSuccessRate(h: Habit, n = 30): number {
  const days = lastNDates(n).filter((d) => h.schedule.includes(weekdayOf(d)));
  if (days.length === 0) return 0;
  const done = days.filter((d) => habitDoneOn(h, d)).length;
  return done / days.length;
}

/* =============== life scores (0–100) =============== */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Habit completion across scheduled slots, last 7 days. */
export function disciplineScore(s: Pick<HealState, "habits">): number {
  const days = lastNDates(7);
  let due = 0;
  let done = 0;
  for (const h of s.habits.filter((x) => !x.archived)) {
    for (const d of days) {
      if (!h.schedule.includes(weekdayOf(d))) continue;
      due++;
      if (habitDoneOn(h, d)) done++;
    }
  }
  if (due === 0) return 0;
  return Math.round((done / due) * 100);
}

/** Water/sleep/steps/workout vs targets, last 7 days. */
export function healthScore(
  s: Pick<HealState, "health" | "settings">
): number {
  const days = lastNDates(7);
  let sum = 0;
  for (const d of days) {
    const h = s.health[d] ?? {};
    const water = clamp01((h.water ?? 0) / s.settings.waterTarget);
    const sleep = clamp01((h.sleepHours ?? 0) / s.settings.sleepTarget);
    const steps = clamp01((h.steps ?? 0) / s.settings.stepsTarget);
    const workout = (h.workoutMin ?? 0) > 0 ? 1 : 0;
    sum += (water + sleep + steps + workout) / 4;
  }
  return Math.round((sum / days.length) * 100);
}

/** Missions completed + focus minutes vs target, last 7 days. */
export function productivityScore(
  s: Pick<HealState, "missions" | "focusSessions" | "settings">
): number {
  const days = new Set(lastNDates(7));
  const relevant = s.missions.filter((m) => days.has(m.date));
  const missionRate =
    relevant.length === 0
      ? 0
      : relevant.filter((m) => m.done).length / relevant.length;
  const focusMin = s.focusSessions
    .filter((f) => days.has(f.date))
    .reduce((a, f) => a + f.minutes, 0);
  const focusRate = clamp01(focusMin / (s.settings.focusTarget * 7));
  const parts = [missionRate, focusRate].filter((_, i) =>
    i === 0 ? relevant.length > 0 : true
  );
  if (relevant.length === 0 && focusMin === 0) return 0;
  return Math.round(
    ((relevant.length > 0 ? missionRate : focusRate) * 0.5 + focusRate * 0.5) * 100
  );
}

/** Study + reading activity vs ~60 min/day, last 7 days. */
export function knowledgeScore(
  s: Pick<HealState, "studySessions" | "books">
): number {
  const days = new Set(lastNDates(7));
  const studyMin = s.studySessions
    .filter((x) => days.has(x.date))
    .reduce((a, x) => a + x.minutes, 0);
  const readingActive = s.books.some((b) => b.status === "reading") ? 15 : 0;
  return Math.round(clamp01((studyMin + readingActive * 7) / (60 * 7)) * 100);
}

/** Budget adherence + savings rate for the current month. */
export function financeScore(
  s: Pick<HealState, "transactions" | "settings">
): number {
  const mk = monthKey(todayISO());
  const txs = s.transactions.filter((t) => monthKey(t.date) === mk);
  if (txs.length === 0) return 0;
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const savingsRate = income > 0 ? clamp01((income - expense) / income) : 0;

  const budgets = Object.entries(s.settings.budgets);
  let adherence = 0.5; // neutral when no budgets set
  if (budgets.length > 0) {
    let ok = 0;
    for (const [cat, limit] of budgets) {
      const spent = txs
        .filter((t) => t.type === "expense" && t.category === cat)
        .reduce((a, t) => a + t.amount, 0);
      if (limit <= 0 || spent <= limit) ok++;
    }
    adherence = ok / budgets.length;
  }
  return Math.round((savingsRate * 0.6 + adherence * 0.4) * 100);
}

/** Focus minutes today vs daily target. */
export function focusScoreToday(
  s: Pick<HealState, "focusSessions" | "settings">
): number {
  const today = todayISO();
  const min = s.focusSessions
    .filter((f) => f.date === today)
    .reduce((a, f) => a + f.minutes, 0);
  return Math.round(clamp01(min / s.settings.focusTarget) * 100);
}

export interface LifeScores {
  discipline: number;
  health: number;
  productivity: number;
  knowledge: number;
  finance: number;
  focus: number;
  life: number;
}

export function lifeScores(s: HealState): LifeScores {
  const discipline = disciplineScore(s);
  const health = healthScore(s);
  const productivity = productivityScore(s);
  const knowledge = knowledgeScore(s);
  const finance = financeScore(s);
  const focus = focusScoreToday(s);
  const active = [discipline, health, productivity, knowledge, finance].filter(
    (x) => x > 0
  );
  const life =
    active.length === 0
      ? 0
      : Math.round(active.reduce((a, x) => a + x, 0) / active.length);
  return { discipline, health, productivity, knowledge, finance, focus, life };
}

/* =============== chart-ready series =============== */

/** XP per day for the last n days: [{date, xp}] oldest→newest. */
export function xpSeries(
  s: Pick<HealState, "xpByDay">,
  n = 7
): Array<{ date: ISODate; xp: number }> {
  return lastNDates(n).map((date) => ({ date, xp: s.xpByDay[date] ?? 0 }));
}

/** GitHub-style contribution grid data for the last n weeks. */
export function contributionGrid(
  s: Pick<HealState, "xpByDay">,
  weeks = 26
): Array<{ date: ISODate; xp: number; level: 0 | 1 | 2 | 3 | 4 }> {
  const days = weeks * 7;
  const values = lastNDates(days).map((date) => ({
    date,
    xp: s.xpByDay[date] ?? 0,
  }));
  const max = Math.max(1, ...values.map((v) => v.xp));
  return values.map((v) => ({
    ...v,
    level:
      v.xp === 0
        ? 0
        : v.xp >= max * 0.75
          ? 4
          : v.xp >= max * 0.5
            ? 3
            : v.xp >= max * 0.25
              ? 2
              : 1,
  }));
}

/** Radar data: level per stat category. */
export function statRadar(
  s: Pick<HealState, "statXp">
): Array<{ stat: string; level: number; key: StatCategory }> {
  return STAT_CATEGORIES.map((key) => ({
    key,
    stat: STAT_LABEL[key],
    level: statLevelFromXp(s.statXp[key] ?? 0),
  }));
}

/** Today's mission progress. */
export function todayMissionProgress(s: Pick<HealState, "missions">): {
  total: number;
  done: number;
  pct: number;
} {
  const today = todayISO();
  const list = s.missions.filter((m) => m.date === today);
  const done = list.filter((m) => m.done).length;
  return {
    total: list.length,
    done,
    pct: list.length === 0 ? 0 : Math.round((done / list.length) * 100),
  };
}

/** Habits due today with their completion state. */
export function habitsToday(s: Pick<HealState, "habits">): Array<{
  habit: Habit;
  count: number;
  done: boolean;
}> {
  const today = todayISO();
  return s.habits
    .filter((h) => isHabitDue(h, today))
    .map((habit) => ({
      habit,
      count: habit.log[today] ?? 0,
      done: habitDoneOn(habit, today),
    }));
}
