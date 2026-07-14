import type { LucideIcon } from "lucide-react";
import { Code, GraduationCap, Languages, School, Sparkles } from "lucide-react";
import type { StudyKind } from "../../store/types";
import { CHART_COLORS } from "../../lib/chartTheme";

/** Fixed order — colors assigned once from CHART_COLORS, never cycled. */
export const STUDY_KINDS: StudyKind[] = [
  "course",
  "coding",
  "language",
  "school",
  "other",
];

export const KIND_META: Record<
  StudyKind,
  { label: string; color: string; icon: LucideIcon }
> = {
  course: { label: "Course", color: CHART_COLORS[0], icon: GraduationCap },
  coding: { label: "Coding", color: CHART_COLORS[1], icon: Code },
  language: { label: "Language", color: CHART_COLORS[2], icon: Languages },
  school: { label: "School", color: CHART_COLORS[3], icon: School },
  other: { label: "Other", color: CHART_COLORS[4], icon: Sparkles },
};

/** 95 → "1h 35m", 60 → "1h", 45 → "45m" */
export function fmtMin(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
