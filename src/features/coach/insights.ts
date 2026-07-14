/**
 * HEAL Coach — rule-based analytics engine.
 * Pure functions over a HealState snapshot. No network, no side effects.
 */
import type { HealState } from "../../store/store";
import type { Difficulty, Habit, ISODate, StatCategory } from "../../store/types";
import { STAT_CATEGORIES, STAT_LABEL } from "../../store/types";
import {
  currentStreak,
  habitDoneOn,
  habitSuccessRate,
  habitsToday,
  todayMissionProgress,
} from "../../store/selectors";
import {
  addDays,
  formatShort,
  formatWeekday,
  greeting,
  lastNDates,
  monthKey,
  todayISO,
  weekdayOf,
} from "../../lib/dates";
import { levelProgress, statLevelFromXp, titleForLevel } from "../../lib/xp";

/* ================= shared helpers ================= */

const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function activeHabits(s: HealState): Habit[] {
  return s.habits.filter((h) => !h.archived);
}

function xpInDays(s: HealState, days: ISODate[]): number {
  return days.reduce((a, d) => a + (s.xpByDay[d] ?? 0), 0);
}

function habitSlots(s: HealState, days: ISODate[]): { due: number; done: number } {
  let due = 0;
  let done = 0;
  for (const h of activeHabits(s)) {
    for (const d of days) {
      if (!h.schedule.includes(weekdayOf(d))) continue;
      due++;
      if (habitDoneOn(h, d)) done++;
    }
  }
  return { due, done };
}

function focusMinutesIn(s: HealState, days: ISODate[]): number {
  const set = new Set(days);
  return s.focusSessions
    .filter((f) => set.has(f.date))
    .reduce((a, f) => a + f.minutes, 0);
}

function sleepStats7(s: HealState): { avg: number | null; logged: number; below: number } {
  let sum = 0;
  let logged = 0;
  let below = 0;
  for (const d of lastNDates(7)) {
    const sl = s.health[d]?.sleepHours;
    if (sl == null) continue;
    logged++;
    sum += sl;
    if (sl < s.settings.sleepTarget) below++;
  }
  return { avg: logged > 0 ? Math.round((sum / logged) * 10) / 10 : null, logged, below };
}

function hotBudgetsThisMonth(
  s: HealState
): Array<{ category: string; spent: number; limit: number; pct: number }> {
  const mk = monthKey(todayISO());
  const out: Array<{ category: string; spent: number; limit: number; pct: number }> = [];
  for (const [category, limit] of Object.entries(s.settings.budgets)) {
    if (limit <= 0) continue;
    const spent = s.transactions
      .filter((t) => t.type === "expense" && t.category === category && monthKey(t.date) === mk)
      .reduce((a, t) => a + t.amount, 0);
    const pct = Math.round((spent / limit) * 100);
    if (pct >= 80) out.push({ category, spent: Math.round(spent), limit, pct });
  }
  return out.sort((a, b) => b.pct - a.pct);
}

function staleGoalList(s: HealState): Array<{ title: string; ageDays: number }> {
  const now = Date.now();
  return s.goals
    .filter(
      (g) =>
        g.status === "active" &&
        g.milestones.every((m) => !m.done) &&
        now - g.createdAt > 14 * DAY_MS
    )
    .map((g) => ({ title: g.title, ageDays: Math.floor((now - g.createdAt) / DAY_MS) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

/* ================= payload union ================= */

export type CoachPayload =
  | { kind: "text"; text: string }
  | { kind: "week"; data: WeekAnalysis }
  | { kind: "schedule"; data: SchedulePlan }
  | { kind: "slipping"; data: SlippingReport }
  | { kind: "motivate"; data: Motivation }
  | { kind: "report"; data: WeeklyReport }
  | { kind: "burnout"; data: BurnoutAssessment };

/* ================= welcome ================= */

export function buildWelcome(s: HealState): string {
  const lp = levelProgress(s.totalXp);
  const streak = currentStreak(s);
  const mp = todayMissionProgress(s);
  const ht = habitsToday(s);
  const habitsDone = ht.filter((x) => x.done).length;

  const streakPart =
    streak > 0
      ? `your ${streak}-day streak is alive and burning`
      : `today is a clean slate — the perfect day to light a new streak`;
  const missionPart =
    mp.total > 0 ? `${mp.done}/${mp.total} missions cleared` : `no missions on the board yet`;
  const habitPart = ht.length > 0 ? `${habitsDone}/${ht.length} habits checked` : `no habits due`;

  return (
    `${greeting()}, ${s.settings.name}! You're Level ${lp.level} — ${titleForLevel(lp.level)} — and ${streakPart}. ` +
    `Today so far: ${missionPart} and ${habitPart}. ` +
    `Pick a quick action below and let's see where the numbers take us.`
  );
}

/* ================= 1 · week analysis ================= */

export interface WeekAnalysis {
  xpThisWeek: number;
  xpLastWeek: number;
  /** null when last week had 0 XP (no baseline). */
  pctChange: number | null;
  bestDayLabel: string | null;
  bestDayXp: number;
  habitDue: number;
  habitDone: number;
  habitPct: number;
  focusMin: number;
  missionsDone: number;
  headline: string;
}

export function analyzeWeek(s: HealState): WeekAnalysis {
  const week = lastNDates(7);
  const prior = lastNDates(7, addDays(todayISO(), -7));
  const xpThisWeek = xpInDays(s, week);
  const xpLastWeek = xpInDays(s, prior);
  const pctChange =
    xpLastWeek > 0 ? Math.round(((xpThisWeek - xpLastWeek) / xpLastWeek) * 100) : null;

  let bestDay: ISODate | null = null;
  let bestDayXp = 0;
  for (const d of week) {
    const v = s.xpByDay[d] ?? 0;
    if (v > bestDayXp) {
      bestDayXp = v;
      bestDay = d;
    }
  }

  const slots = habitSlots(s, week);
  const habitPct = slots.due === 0 ? 0 : Math.round((slots.done / slots.due) * 100);
  const weekSet = new Set(week);
  const missionsDone = s.missions.filter((m) => m.done && weekSet.has(m.date)).length;
  const focusMin = focusMinutesIn(s, week);

  let headline: string;
  if (xpThisWeek === 0 && xpLastWeek === 0)
    headline =
      "Two quiet weeks in a row — the log is nearly empty. Let's put some points on the board today.";
  else if (pctChange === null)
    headline = `First tracked week — ${xpThisWeek} XP banked. That's your baseline; next week we beat it.`;
  else if (pctChange >= 10)
    headline = `Momentum is real: ${pctChange}% more XP than last week. Whatever you changed — keep it.`;
  else if (pctChange <= -10)
    headline = `Output dropped ${Math.abs(pctChange)}% vs last week. Not a crisis — but let's stop the slide today.`;
  else
    headline =
      "Output is holding steady week-over-week. Consistency is a superpower — now nudge the ceiling.";

  return {
    xpThisWeek,
    xpLastWeek,
    pctChange,
    bestDayLabel: bestDay ? `${formatWeekday(bestDay)} · ${formatShort(bestDay)}` : null,
    bestDayXp,
    habitDue: slots.due,
    habitDone: slots.done,
    habitPct,
    focusMin,
    missionsDone,
    headline,
  };
}

/* ================= 2 · today's schedule ================= */

export interface ScheduleBlock {
  id: string;
  start: string;
  end: string;
  label: string;
  kind: "mission" | "habit" | "focus" | "water";
  category?: StatCategory;
  difficulty?: Difficulty;
  icon?: string;
}

export interface SchedulePlan {
  blocks: ScheduleBlock[];
  missionBlocks: number;
  habitBlocks: number;
  focusBlocks: number;
  waterRemaining: number;
  focusLogged: number;
  focusTarget: number;
  reason: "ok" | "clear" | "late";
  note: string;
}

const DIFF_ORDER: Record<Difficulty, number> = { epic: 0, hard: 1, medium: 2, easy: 3 };

function fmtMin(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildSchedule(s: HealState, now: Date = new Date()): SchedulePlan {
  const today = todayISO();
  const missions = s.missions
    .filter((m) => m.date === today && !m.done)
    .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
  const dueHabits = habitsToday(s).filter((x) => !x.done);
  const focusLogged = focusMinutesIn(s, [today]);
  const focusTarget = s.settings.focusTarget;
  const waterDone = s.health[today]?.water ?? 0;
  const waterRemaining = Math.max(0, s.settings.waterTarget - waterDone);

  const DAY_END = 23 * 60;
  let cursor = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;

  interface Item {
    label: string;
    slots: number;
    kind: "mission" | "habit" | "focus";
    category?: StatCategory;
    difficulty?: Difficulty;
    icon?: string;
  }
  const items: Item[] = [];
  for (const m of missions.slice(0, 5)) {
    items.push({
      label: `Deep work: ${m.title}`,
      slots: m.difficulty === "epic" || m.difficulty === "hard" ? 2 : 1,
      kind: "mission",
      category: m.category,
      difficulty: m.difficulty,
    });
  }
  for (const { habit } of dueHabits.slice(0, 4)) {
    items.push({
      label: habit.name,
      slots: 1,
      kind: "habit",
      category: habit.category,
      icon: habit.icon,
    });
  }
  const missionFocusMin = items
    .filter((i) => i.kind === "mission")
    .reduce((a, i) => a + i.slots * 25, 0);
  let focusGap = Math.max(0, focusTarget - focusLogged - missionFocusMin);
  while (focusGap > 0 && items.filter((i) => i.kind === "focus").length < 3) {
    items.push({ label: "Focus sprint — close today's focus gap", slots: 1, kind: "focus" });
    focusGap -= 25;
  }

  const blocks: ScheduleBlock[] = [];
  let waterLeft = waterRemaining;
  let glass = waterDone + 1;
  let waterMarkers = 0;
  let id = 0;
  for (const it of items) {
    const minutes = it.slots * 30;
    if (cursor + minutes > DAY_END) break;
    blocks.push({
      id: `b${id++}`,
      start: fmtMin(cursor),
      end: fmtMin(cursor + minutes - 5),
      label: it.label,
      kind: it.kind,
      category: it.category,
      difficulty: it.difficulty,
      icon: it.icon,
    });
    cursor += minutes;
    if (waterLeft > 0 && waterMarkers < 4) {
      blocks.push({
        id: `b${id++}`,
        start: fmtMin(cursor),
        end: fmtMin(cursor),
        label: `Hydrate — glass ${glass} of ${s.settings.waterTarget}`,
        kind: "water",
      });
      waterLeft--;
      glass++;
      waterMarkers++;
    }
  }

  const missionBlocks = blocks.filter((b) => b.kind === "mission").length;
  const habitBlocks = blocks.filter((b) => b.kind === "habit").length;
  const focusBlocks = blocks.filter((b) => b.kind === "focus").length;

  let reason: SchedulePlan["reason"] = "ok";
  let note: string;
  if (items.length === 0) {
    reason = "clear";
    note =
      waterRemaining > 0
        ? `Missions, habits and focus target are all handled — recovery mode unlocked. Just ${waterRemaining} glass${waterRemaining > 1 ? "es" : ""} of water left to close the day perfectly.`
        : "Missions, habits, focus AND water — everything is done. Legendary day. Rest is part of the training.";
    if (waterRemaining > 0 && cursor < DAY_END) {
      blocks.push({
        id: "w-final",
        start: fmtMin(cursor),
        end: fmtMin(cursor),
        label: `Hydrate — ${waterRemaining} glass${waterRemaining > 1 ? "es" : ""} left today`,
        kind: "water",
      });
    }
  } else if (blocks.filter((b) => b.kind !== "water").length === 0) {
    reason = "late";
    note =
      "The day is nearly over — no room left for full blocks. Skip the plan, pick ONE small win, and give it 25 quiet minutes before bed.";
  } else {
    const first = blocks[0].start;
    note = `${missionBlocks} deep-work, ${habitBlocks} habit and ${focusBlocks} focus block${focusBlocks === 1 ? "" : "s"} locked in from ${first}. Focus already banked today: ${focusLogged}/${focusTarget} min.`;
  }

  return {
    blocks,
    missionBlocks,
    habitBlocks,
    focusBlocks,
    waterRemaining,
    focusLogged,
    focusTarget,
    reason,
    note,
  };
}

/* ================= 3 · slipping ================= */

export interface SlippingReport {
  weakestHabit: { name: string; icon: string; ratePct: number } | null;
  worstWeekday: { name: string; pct: number } | null;
  hotBudgets: Array<{ category: string; spent: number; limit: number; pct: number }>;
  currency: string;
  sleepBelow: number;
  sleepLogged: number;
  sleepTarget: number;
  staleGoals: Array<{ title: string; ageDays: number }>;
  issueCount: number;
}

export function analyzeSlipping(s: HealState): SlippingReport {
  const now = Date.now();

  // Weakest habit — only habits older than 3 days, lowest 14d success rate.
  let weakestHabit: SlippingReport["weakestHabit"] = null;
  let worstRate = Infinity;
  for (const h of activeHabits(s)) {
    if (now - h.createdAt <= 3 * DAY_MS || h.schedule.length === 0) continue;
    const rate = habitSuccessRate(h, 14);
    if (rate < worstRate) {
      worstRate = rate;
      weakestHabit = { name: h.name, icon: h.icon, ratePct: Math.round(rate * 100) };
    }
  }
  if (weakestHabit && weakestHabit.ratePct >= 80) weakestHabit = null;

  // Weekday with the lowest habit completion (last 28 days).
  const per = new Map<number, { due: number; done: number }>();
  for (const h of activeHabits(s)) {
    for (const d of lastNDates(28)) {
      const wd = weekdayOf(d);
      if (!h.schedule.includes(wd)) continue;
      const p = per.get(wd) ?? { due: 0, done: 0 };
      p.due++;
      if (habitDoneOn(h, d)) p.done++;
      per.set(wd, p);
    }
  }
  let worstWeekday: SlippingReport["worstWeekday"] = null;
  let worstWdPct = Infinity;
  for (const [wd, p] of per) {
    if (p.due < 4) continue;
    const pct = Math.round((p.done / p.due) * 100);
    if (pct < worstWdPct) {
      worstWdPct = pct;
      worstWeekday = { name: WEEKDAY_NAMES[wd], pct };
    }
  }
  if (worstWeekday && worstWeekday.pct >= 60) worstWeekday = null;

  const hotBudgets = hotBudgetsThisMonth(s);
  const sleep = sleepStats7(s);
  const staleGoals = staleGoalList(s);

  const issueCount =
    (weakestHabit ? 1 : 0) +
    (worstWeekday ? 1 : 0) +
    (hotBudgets.length > 0 ? 1 : 0) +
    (sleep.below >= 2 ? 1 : 0) +
    (staleGoals.length > 0 ? 1 : 0);

  return {
    weakestHabit,
    worstWeekday,
    hotBudgets,
    currency: s.settings.currency,
    sleepBelow: sleep.below,
    sleepLogged: sleep.logged,
    sleepTarget: s.settings.sleepTarget,
    staleGoals,
    issueCount,
  };
}

/* ================= 4 · motivation ================= */

export interface Motivation {
  line: string;
  context: string;
}

interface MotivationCtx {
  level: number;
  title: string;
  streak: number;
  xpToday: number;
  name: string;
}

const MOTIVATION_LINES: Array<(c: MotivationCtx) => string> = [
  (c) =>
    `Nobody is coming to do the work for you, ${c.name}. Good — you've never needed them. Level ${c.level} is proof.`,
  (c) =>
    c.streak > 0
      ? `A ${c.streak}-day streak is ${c.streak} promises kept to yourself. Don't negotiate with the version of you that wants to quit tonight.`
      : `The streak counter reads zero — which makes today the cheapest day there will ever be to start one. Move.`,
  () =>
    `Discipline is choosing what you want MOST over what you want NOW. You already know which one tonight's choice is.`,
  (c) =>
    `The ${c.title} standing at Level ${Math.min(100, c.level + 5)} is built from the next hour, not the next year. Spend it like it matters.`,
  () => `Motivation is weather. Systems are climate. Feed your habits and you stop needing to feel like it.`,
  () => `You don't need a perfect day. You need 25 ruthless minutes. Everything else is decoration.`,
  (c) =>
    `Titles aren't given, ${c.name} — "${c.title}" was earned on days you didn't feel like it. Today is one of those days.`,
  (c) =>
    c.xpToday > 0
      ? `${c.xpToday} XP banked already today. Winners run up the score — go take the next 50.`
      : `Today's ledger is still blank. One mission in the next 10 minutes rewrites the whole day's story.`,
  () => `Comfort is a slow leak. Every mission you clear patches the hull. Clear one now.`,
  () => `You are one hard decision away from a completely different evening. Make it — then make the next one.`,
];

export function buildMotivation(s: HealState, seed: number): Motivation {
  const lp = levelProgress(s.totalXp);
  const ctx: MotivationCtx = {
    level: lp.level,
    title: titleForLevel(lp.level),
    streak: currentStreak(s),
    xpToday: s.xpByDay[todayISO()] ?? 0,
    name: s.settings.name,
  };
  const line = MOTIVATION_LINES[Math.abs(seed) % MOTIVATION_LINES.length](ctx);
  return {
    line,
    context: `Level ${ctx.level} ${ctx.title} · ${ctx.streak}-day streak · ${ctx.xpToday} XP today`,
  };
}

/* ================= 5 · weekly report ================= */

export interface WeeklyReport {
  rangeLabel: string;
  xpThisWeek: number;
  missionsDone: number;
  level: number;
  title: string;
  levelCurrent: number;
  levelNeeded: number;
  strongestStat: { label: string; level: number } | null;
  habitDue: number;
  habitDone: number;
  habitPct: number;
  bestHabit: { name: string; icon: string; ratePct: number } | null;
  focusMin: number;
  focusSessions: number;
  focusTargetWeek: number;
  avgSleep: number | null;
  sleepTarget: number;
  waterDaysOnTarget: number;
  netMonth: { income: number; expense: number; net: number; currency: string };
  recommendations: string[];
}

export function buildWeeklyReport(s: HealState): WeeklyReport {
  const week = lastNDates(7);
  const weekSet = new Set(week);
  const xpThisWeek = xpInDays(s, week);
  const missionsDone = s.missions.filter((m) => m.done && weekSet.has(m.date)).length;
  const lp = levelProgress(s.totalXp);

  // "Strongest stat" — approximated from lifetime statXp ranking (no per-day category data).
  let strongestStat: WeeklyReport["strongestStat"] = null;
  let bestXp = 0;
  for (const key of STAT_CATEGORIES) {
    const v = s.statXp[key] ?? 0;
    if (v > bestXp) {
      bestXp = v;
      strongestStat = { label: STAT_LABEL[key], level: statLevelFromXp(v) };
    }
  }

  const slots = habitSlots(s, week);
  const habitPct = slots.due === 0 ? 0 : Math.round((slots.done / slots.due) * 100);
  let bestHabit: WeeklyReport["bestHabit"] = null;
  let bestRate = 0;
  for (const h of activeHabits(s)) {
    if (h.schedule.length === 0) continue;
    const rate = habitSuccessRate(h, 7);
    if (rate > bestRate) {
      bestRate = rate;
      bestHabit = { name: h.name, icon: h.icon, ratePct: Math.round(rate * 100) };
    }
  }

  const focusMin = focusMinutesIn(s, week);
  const focusSessions = s.focusSessions.filter((f) => weekSet.has(f.date)).length;
  const focusTargetWeek = s.settings.focusTarget * 7;

  const sleep = sleepStats7(s);
  const waterDaysOnTarget = week.filter(
    (d) => (s.health[d]?.water ?? 0) >= s.settings.waterTarget
  ).length;

  const mk = monthKey(todayISO());
  const monthTx = s.transactions.filter((t) => monthKey(t.date) === mk);
  const income = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  // Recommendations — most urgent first, top 3.
  const hotBudgets = hotBudgetsThisMonth(s);
  const staleGoals = staleGoalList(s);
  const recs: string[] = [];
  if (slots.due > 0 && habitPct < 60)
    recs.push(
      `Habit completion sits at ${habitPct}% this week — cut down to your 2 keystone habits and protect them at a fixed time every day.`
    );
  if (focusMin < focusTargetWeek * 0.5)
    recs.push(
      `Only ${focusMin} of a ${focusTargetWeek}-min weekly focus target logged. Block one 25-min sprint before noon tomorrow — momentum first, volume later.`
    );
  if (sleep.avg !== null && sleep.avg < s.settings.sleepTarget)
    recs.push(
      `Averaging ${sleep.avg}h sleep vs your ${s.settings.sleepTarget}h target — pull bedtime forward 30 minutes this week; everything else gets easier.`
    );
  if (sleep.avg === null)
    recs.push(`No sleep logs this week — track 7 nights so I can watch your recovery properly.`);
  if (hotBudgets.length > 0)
    recs.push(
      `${hotBudgets[0].category} is at ${hotBudgets[0].pct}% of its monthly budget — freeze non-essential spending in that category now.`
    );
  if (staleGoals.length > 0)
    recs.push(
      `"${staleGoals[0].title}" has had zero milestone progress in ${staleGoals[0].ageDays} days — carve off one 30-minute milestone and finish it this week.`
    );
  if (missionsDone === 0)
    recs.push(`Zero missions completed this week — add one easy mission each morning to rebuild the win reflex.`);
  recs.push(`Your streak is your most valuable asset — schedule tomorrow's first win tonight.`);
  recs.push(`End the day with a 2-minute night journal to lock in what worked.`);
  recs.push(`Stack a new habit right after your strongest one — same trigger, near-free consistency.`);

  return {
    rangeLabel: `${formatShort(week[0])} – ${formatShort(week[6])}`,
    xpThisWeek,
    missionsDone,
    level: lp.level,
    title: titleForLevel(lp.level),
    levelCurrent: lp.current,
    levelNeeded: lp.needed,
    strongestStat,
    habitDue: slots.due,
    habitDone: slots.done,
    habitPct,
    bestHabit,
    focusMin,
    focusSessions,
    focusTargetWeek,
    avgSleep: sleep.avg,
    sleepTarget: s.settings.sleepTarget,
    waterDaysOnTarget,
    netMonth: {
      income: Math.round(income),
      expense: Math.round(expense),
      net: Math.round(income - expense),
      currency: s.settings.currency,
    },
    recommendations: recs.slice(0, 3),
  };
}

/* ================= 6 · burnout ================= */

export type BurnoutLevel = "healthy" | "warning" | "risk";

export interface BurnoutFactor {
  label: string;
  value: string;
  flag: "good" | "warn" | "bad";
}

export interface BurnoutAssessment {
  level: BurnoutLevel;
  score: number;
  factors: BurnoutFactor[];
  advice: string[];
}

export function assessBurnout(s: HealState): BurnoutAssessment {
  let score = 0;
  const factors: BurnoutFactor[] = [];

  // 1. Days since a zero-XP (rest) day, scanning the 21 days ending yesterday.
  const days = lastNDates(21, addDays(todayISO(), -1));
  let daysSinceRest: number | null = null;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((s.xpByDay[days[i]] ?? 0) === 0) {
      daysSinceRest = days.length - i;
      break;
    }
  }
  if (daysSinceRest === null) {
    score += 30;
    factors.push({ label: "Recovery", value: "No zero-XP day in 21 days", flag: "bad" });
  } else if (daysSinceRest >= 14) {
    score += 22;
    factors.push({ label: "Recovery", value: `Last rest day ${daysSinceRest} days ago`, flag: "warn" });
  } else if (daysSinceRest >= 7) {
    score += 12;
    factors.push({ label: "Recovery", value: `Last rest day ${daysSinceRest} days ago`, flag: "warn" });
  } else {
    factors.push({
      label: "Recovery",
      value: daysSinceRest === 1 ? "Rest day yesterday" : `Rest day ${daysSinceRest} days ago`,
      flag: "good",
    });
  }

  // 2. Average sleep (7d) vs target.
  const sleep = sleepStats7(s);
  const target = s.settings.sleepTarget;
  if (sleep.avg === null) {
    score += 8;
    factors.push({ label: "Sleep (7d)", value: "No sleep logs", flag: "warn" });
  } else if (sleep.avg < target * 0.8) {
    score += 30;
    factors.push({ label: "Sleep (7d)", value: `${sleep.avg}h avg vs ${target}h target`, flag: "bad" });
  } else if (sleep.avg < target * 0.95) {
    score += 15;
    factors.push({ label: "Sleep (7d)", value: `${sleep.avg}h avg vs ${target}h target`, flag: "warn" });
  } else {
    factors.push({ label: "Sleep (7d)", value: `${sleep.avg}h avg vs ${target}h target`, flag: "good" });
  }

  // 3. Focus-load trend: this week vs prior week.
  const f7 = focusMinutesIn(s, lastNDates(7));
  const fPrior = focusMinutesIn(s, lastNDates(7, addDays(todayISO(), -7)));
  const trendPct = fPrior > 0 ? Math.round(((f7 - fPrior) / fPrior) * 100) : f7 > 0 ? 100 : 0;
  if (trendPct >= 60 && f7 >= 300) {
    score += 20;
    factors.push({ label: "Focus load", value: `${f7} min (+${trendPct}% vs prior week)`, flag: "bad" });
  } else if (trendPct >= 30 && f7 >= 180) {
    score += 10;
    factors.push({ label: "Focus load", value: `${f7} min (+${trendPct}% vs prior week)`, flag: "warn" });
  } else if (f7 === 0 && fPrior === 0) {
    factors.push({ label: "Focus load", value: "No sessions logged", flag: "good" });
  } else {
    factors.push({
      label: "Focus load",
      value: `${f7} min (${trendPct >= 0 ? "+" : ""}${trendPct}% vs prior week)`,
      flag: "good",
    });
  }

  // 4. Streak length — long unbroken streaks add pressure.
  const streak = currentStreak(s);
  if (streak >= 21) {
    score += 15;
    factors.push({ label: "Streak", value: `${streak} days unbroken`, flag: "warn" });
  } else if (streak >= 14) {
    score += 8;
    factors.push({ label: "Streak", value: `${streak} days unbroken`, flag: "warn" });
  } else {
    factors.push({ label: "Streak", value: `${streak} day${streak === 1 ? "" : "s"}`, flag: "good" });
  }

  const level: BurnoutLevel = score >= 55 ? "risk" : score >= 28 ? "warning" : "healthy";
  const advice =
    level === "risk"
      ? [
          "Schedule a deliberate recovery day within 48 hours — zero missions, zero guilt.",
          "Cut tomorrow's plan down to a single must-win mission.",
          `Protect sleep tonight: screens off 60 minutes before your ${target}h window.`,
        ]
      : level === "warning"
        ? [
            "Insert one lighter day this week — half your usual load.",
            "Swap one evening focus sprint for a walk or mobility work.",
            "Keep the streak with a 10-minute minimum day instead of a maximum day.",
          ]
        : [
            "Load looks sustainable — keep the current rhythm.",
            "Bank recovery on purpose: one easy day per week keeps the engine clean.",
            "This is the moment to nudge one mission's difficulty up a notch.",
          ];

  return { level, score: Math.min(100, score), factors, advice };
}
