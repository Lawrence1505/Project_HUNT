import { Coins, Lock } from "lucide-react";
import type { AchievementDef } from "../../store/achievements";
import { ACHIEVEMENT_COIN_BONUS } from "../../store/achievements";
import { TIER_COLOR, TIER_LABEL } from "./tiers";

export function AchievementCard({
  def,
  unlockedAt,
}: {
  def: AchievementDef;
  /** epoch ms when unlocked; undefined = still locked */
  unlockedAt?: number;
}) {
  const tierColor = TIER_COLOR[def.tier];
  const bonus = ACHIEVEMENT_COIN_BONUS[def.tier];
  const isUnlocked = unlockedAt != null;

  return (
    <div
      className="card card-hover"
      style={{
        position: "relative",
        overflow: "hidden",
        ...(isUnlocked
          ? {
              borderColor: `color-mix(in srgb, ${tierColor} 35%, transparent)`,
              boxShadow: `0 0 22px color-mix(in srgb, ${tierColor} 12%, transparent)`,
            }
          : {}),
      }}
    >
      {!isUnlocked && (
        <div
          title="Locked — complete the quest below"
          aria-label="Locked"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: "var(--radius-full)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-3)",
          }}
        >
          <Lock size={13} />
        </div>
      )}

      <div
        style={
          isUnlocked
            ? undefined
            : { filter: "grayscale(1)", opacity: 0.45, transition: "filter 300ms ease, opacity 300ms ease" }
        }
      >
        <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 10 }}>{def.icon}</div>
        <div className="card-title" style={{ marginBottom: 4 }}>
          {def.name}
        </div>
        <p className="small muted" style={{ marginBottom: 12, minHeight: 34 }}>
          {def.desc}
        </p>

        <div className="row wrap" style={{ gap: 6 }}>
          <span
            className="chip"
            style={{
              color: tierColor,
              borderColor: `color-mix(in srgb, ${tierColor} 40%, transparent)`,
            }}
          >
            {TIER_LABEL[def.tier]}
          </span>
          <span className="chip" style={{ color: "var(--warning)" }}>
            <Coins size={12} />
            +{bonus}
          </span>
        </div>

        {unlockedAt != null && (
          <div className="small muted" style={{ marginTop: 10 }}>
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
