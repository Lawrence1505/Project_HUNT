import { useMemo, useState } from "react";
import { Coins, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_COIN_BONUS,
  type AchievementDef,
} from "../../store/achievements";
import { ProgressRing, EmptyState } from "../../components/ui";
import { AchievementCard } from "./AchievementCard";
import { TIERS, TIER_COLOR, TIER_MEDAL } from "./tiers";

type Filter = "all" | "unlocked" | "locked";

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  unlocked: "Unlocked",
  locked: "Locked",
};

export default function AchievementsPage() {
  const unlocked = useHeal((s) => s.unlocked);
  const [filter, setFilter] = useState<Filter>("all");

  const total = ACHIEVEMENTS.length;

  const { sorted, unlockedCount, bonusCoins, tierCounts } = useMemo(() => {
    const isUnlocked = (a: AchievementDef) => unlocked[a.id] != null;

    const unlockedList = ACHIEVEMENTS.filter(isUnlocked).sort(
      (a, b) => (unlocked[b.id] ?? 0) - (unlocked[a.id] ?? 0)
    );
    const lockedList = ACHIEVEMENTS.filter((a) => !isUnlocked(a)).sort(
      (a, b) => a.tier - b.tier
    );

    const coins = unlockedList.reduce(
      (sum, a) => sum + ACHIEVEMENT_COIN_BONUS[a.tier],
      0
    );

    const counts = TIERS.map((tier) => {
      const inTier = ACHIEVEMENTS.filter((a) => a.tier === tier);
      return {
        tier,
        total: inTier.length,
        unlocked: inTier.filter(isUnlocked).length,
      };
    });

    return {
      sorted: [...unlockedList, ...lockedList],
      unlockedCount: unlockedList.length,
      bonusCoins: coins,
      tierCounts: counts,
    };
  }, [unlocked]);

  const visible = useMemo(() => {
    if (filter === "unlocked") return sorted.filter((a) => unlocked[a.id] != null);
    if (filter === "locked") return sorted.filter((a) => unlocked[a.id] == null);
    return sorted;
  }, [sorted, filter, unlocked]);

  const lockedCount = total - unlockedCount;

  return (
    <div className="page">
      <h1 className="page-title">Achievements</h1>
      <p className="page-subtitle">
        Your trophy hall — every badge is proof of a battle won.
      </p>

      {/* ---- header summary ---- */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row wrap" style={{ gap: 24, alignItems: "center" }}>
          <ProgressRing pct={total > 0 ? unlockedCount / total : 0} size={118} stroke={9}>
            <div className="gradient-text" style={{ fontSize: 26, fontWeight: 800 }}>
              {unlockedCount}
            </div>
            <div className="small muted">of {total}</div>
          </ProgressRing>

          <div className="col grow" style={{ gap: 10, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {unlockedCount} of {total} unlocked
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <span className="chip" style={{ color: "var(--warning)" }}>
                <Coins size={13} />
                {bonusCoins.toLocaleString()} bonus coins earned
              </span>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              {tierCounts.map((tc) => (
                <span
                  key={tc.tier}
                  className="chip mono"
                  style={{
                    color: TIER_COLOR[tc.tier],
                    borderColor: `color-mix(in srgb, ${TIER_COLOR[tc.tier]} 35%, transparent)`,
                  }}
                >
                  {TIER_MEDAL[tc.tier]} {tc.unlocked}/{tc.total}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- filter tabs ---- */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        {(["all", "unlocked", "locked"] as const).map((f) => (
          <button
            key={f}
            className={`tab${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABEL[f]}{" "}
            <span className="muted">
              {f === "all" ? total : f === "unlocked" ? unlockedCount : lockedCount}
            </span>
          </button>
        ))}
      </div>

      {/* ---- gallery ---- */}
      {visible.length === 0 ? (
        filter === "unlocked" ? (
          <EmptyState
            icon={<Trophy size={28} />}
            title="No achievements unlocked yet"
            hint="Complete missions, build habit streaks, and keep showing up — your first badge is closer than you think."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setFilter("all")}>
                Browse all achievements
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<Trophy size={28} />}
            title="Flawless victory"
            hint="Every single achievement is unlocked. You are the final boss now."
          />
        )
      ) : (
        <div className="grid grid-auto">
          {visible.map((a) => (
            <AchievementCard key={a.id} def={a} unlockedAt={unlocked[a.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
