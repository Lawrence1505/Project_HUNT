import {
  CalendarDays,
  Compass,
  Mountain,
  Rocket,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Goal, GoalHorizon } from "../../store/types";

/** Tab keys: the five horizons plus the trophy room. */
export type TabKey = GoalHorizon | "done";

export const HORIZON_ORDER: GoalHorizon[] = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
];

export const TAB_ORDER: TabKey[] = [...HORIZON_ORDER, "done"];

export interface TabMeta {
  label: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyHint: string;
}

export const TAB_META: Record<TabKey, TabMeta> = {
  weekly: {
    label: "Weekly",
    icon: Zap,
    emptyTitle: "A week is a sprint — what will you win this week?",
    emptyHint: "Small, sharp objectives. Pick one target and strike fast.",
  },
  monthly: {
    label: "Monthly",
    icon: CalendarDays,
    emptyTitle: "A month of focus can bend your trajectory.",
    emptyHint: "Set a monthly quest and break it into 3–5 milestones.",
  },
  quarterly: {
    label: "Quarterly",
    icon: Compass,
    emptyTitle: "Quarters are campaigns — plan yours.",
    emptyHint: "Ninety days is long enough to build something real.",
  },
  yearly: {
    label: "Yearly",
    icon: Rocket,
    emptyTitle: "What would make this year legendary?",
    emptyHint: "One bold objective beats ten vague wishes.",
  },
  lifetime: {
    label: "Lifetime",
    icon: Mountain,
    emptyTitle: "The dungeon is deep. Name your final boss.",
    emptyHint: "Lifetime goals give every daily grind a direction.",
  },
  done: {
    label: "Done",
    icon: Trophy,
    emptyTitle: "No victories enshrined yet.",
    emptyHint: "Complete a goal and it will be recorded here forever.",
  },
};

export type Priority = Goal["priority"];

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; rank: number }
> = {
  high: { label: "High", color: "var(--danger)", rank: 0 },
  medium: { label: "Medium", color: "var(--warning)", rank: 1 },
  low: { label: "Low", color: "var(--text-3)", rank: 2 },
};
