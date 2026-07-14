/**
 * HEAL chart theme — single source of truth for all Recharts usage.
 * Categorical palette validated for CVD separation + contrast on the
 * app's dark surface (#0a0a16). Assign hues in FIXED ORDER, never cycle
 * past the end — fold extras into "Other".
 */
export const CHART_COLORS = [
  "#8b5cf6", // violet
  "#0284c7", // blue
  "#059669", // green
  "#d97706", // amber
  "#ec4899", // pink
  "#ea580c", // orange
] as const;

/** Sequential ramp for heatmaps (level 0..4), dark→bright = low→high. */
export const HEAT_RAMP = [
  "rgba(255,255,255,0.055)",
  "#2e1e5e",
  "#4c2f96",
  "#6d43d0",
  "#8b5cf6",
] as const;

/** Recessive grid + axis styling shared by every chart. */
export const GRID_STROKE = "rgba(255,255,255,0.07)";
export const AXIS_TICK = { fill: "#7d7d99", fontSize: 11.5 } as const;
export const AXIS_LINE = { stroke: "rgba(255,255,255,0.12)" } as const;

/** Pass to <Tooltip contentStyle/labelStyle/itemStyle>. */
export const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#10101f",
  border: "1px solid rgba(139,92,246,0.45)",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
  fontSize: 12.5,
  color: "#f2f2fa",
};
export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "#b9b9cf",
  fontWeight: 650,
  marginBottom: 4,
};
export const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: "#f2f2fa",
};
