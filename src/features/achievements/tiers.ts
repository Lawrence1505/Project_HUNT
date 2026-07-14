import type { AchievementDef } from "../../store/achievements";

/** 1 = Bronze, 2 = Silver, 3 = Gold */
export type Tier = AchievementDef["tier"];

export const TIERS: readonly Tier[] = [1, 2, 3] as const;

export const TIER_COLOR: Record<Tier, string> = {
  1: "#cd7f32",
  2: "#c0c0c0",
  3: "#ffd700",
};

export const TIER_LABEL: Record<Tier, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
};

export const TIER_MEDAL: Record<Tier, string> = {
  1: "🥉",
  2: "🥈",
  3: "🥇",
};
