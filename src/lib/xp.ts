/**
 * HEAL leveling engine.
 * Total XP required to *reach* level L (level 1 = 0 XP):
 *   need(L) = round(100 * (L-1)^1.6)
 * Level 2 = 100 XP, level 10 ≈ 3.4k, level 50 ≈ 50k, level 100 ≈ 155k.
 */

export const MAX_LEVEL = 100;

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpToReachLevel(lvl + 1)) lvl++;
  return lvl;
}

/** Progress within the current level, 0..1. */
export function levelProgress(xp: number): {
  level: number;
  current: number;
  needed: number;
  pct: number;
} {
  const level = levelFromXp(xp);
  const base = xpToReachLevel(level);
  const next = level >= MAX_LEVEL ? base : xpToReachLevel(level + 1);
  const needed = Math.max(1, next - base);
  const current = Math.min(needed, xp - base);
  return { level, current, needed, pct: Math.min(1, current / needed) };
}

/** Smaller curve for the 10 stat categories. */
export function statLevelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= Math.round(60 * Math.pow(lvl, 1.5))) lvl++;
  return lvl;
}

export function statLevelProgress(xp: number): { level: number; pct: number } {
  const level = statLevelFromXp(xp);
  const base = level === 1 ? 0 : Math.round(60 * Math.pow(level - 1, 1.5));
  const next = Math.round(60 * Math.pow(level, 1.5));
  return { level, pct: Math.min(1, (xp - base) / Math.max(1, next - base)) };
}

/** Title milestones (Solo-Leveling flavored). */
const TITLES: Array<[number, string]> = [
  [100, "Legend"],
  [90, "Ascendant"],
  [75, "Elite"],
  [60, "Sage"],
  [50, "Master"],
  [40, "Warrior"],
  [30, "Scholar"],
  [20, "Focused"],
  [15, "Consistent"],
  [10, "Disciplined"],
  [5, "Awakened"],
  [1, "Beginner"],
];

export function titleForLevel(level: number): string {
  for (const [lvl, title] of TITLES) if (level >= lvl) return title;
  return "Beginner";
}

/** Hunter-style rank. */
const RANKS: Array<[number, string]> = [
  [100, "SSS"],
  [85, "SS"],
  [70, "S"],
  [55, "A"],
  [40, "B"],
  [25, "C"],
  [12, "D"],
  [1, "E"],
];

export function rankForLevel(level: number): string {
  for (const [lvl, rank] of RANKS) if (level >= lvl) return rank;
  return "E";
}

export type Difficulty = "easy" | "medium" | "hard" | "epic";

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
  epic: 100,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  epic: "Epic",
};

/** Coins earned alongside XP. */
export function coinsForXp(xp: number): number {
  return Math.max(1, Math.round(xp / 5));
}
