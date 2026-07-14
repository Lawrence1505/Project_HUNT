import { Link } from "react-router-dom";
import { Coins, Flame, Shield, Swords, Trophy, Zap } from "lucide-react";
import { useHeal } from "../../store/store";
import {
  levelProgress,
  titleForLevel,
  rankForLevel,
  MAX_LEVEL,
} from "../../lib/xp";
import {
  currentStreak,
  longestStreak,
  todayMissionProgress,
} from "../../store/selectors";
import { todayISO } from "../../lib/dates";
import { ProgressBar, ProgressRing } from "../../components/ui";

/* ---------- (a) Level card ---------- */

function LevelCard() {
  const totalXp = useHeal((s) => s.totalXp);
  const lp = levelProgress(totalXp);
  const rank = rankForLevel(lp.level);

  return (
    <div className="card card-hover card-accent">
      <div className="row wrap" style={{ gap: 18 }}>
        <ProgressRing pct={lp.pct} size={120} stroke={9}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
            {lp.level}
          </div>
          <div className="small muted" style={{ marginTop: 3 }}>
            {titleForLevel(lp.level)}
          </div>
        </ProgressRing>
        <div className="col grow" style={{ gap: 10, minWidth: 140 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <span
              className="chip mono"
              style={{
                color: "var(--violet)",
                borderColor: "rgba(139, 92, 246, 0.45)",
                letterSpacing: "0.08em",
              }}
            >
              <Shield size={12} />
              RANK {rank}
            </span>
            <span className="chip">
              <Zap size={12} color="var(--warning)" />
              {totalXp.toLocaleString()} XP total
            </span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {lp.current.toLocaleString()} / {lp.needed.toLocaleString()} XP
            </div>
            <div className="small muted">
              {lp.level >= MAX_LEVEL
                ? "Peak of the tower — Legend status."
                : `${(lp.needed - lp.current).toLocaleString()} XP to Level ${lp.level + 1}`}
            </div>
          </div>
          <ProgressBar value={lp.current} max={lp.needed} height={6} />
        </div>
      </div>
    </div>
  );
}

/* ---------- (b) Today's mission progress card ---------- */

function missionLine(done: number, total: number): string {
  if (total === 0) return "No missions yet — forge today's plan.";
  if (done === total) return "All missions cleared. Legendary.";
  if (done === 0) return "Your quests await, Hunter.";
  if (done / total >= 0.5) return "Over halfway — finish strong.";
  return "Momentum is building. Keep going.";
}

function MissionProgressCard() {
  const missions = useHeal((s) => s.missions);
  const mp = todayMissionProgress({ missions });

  return (
    <div className="card card-hover">
      <div className="row wrap" style={{ gap: 18 }}>
        <ProgressRing
          pct={mp.total === 0 ? 0 : mp.done / mp.total}
          size={120}
          stroke={9}
        >
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
            {mp.done}
            <span className="muted" style={{ fontSize: 17, fontWeight: 650 }}>
              /{mp.total}
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 3 }}>
            missions
          </div>
        </ProgressRing>
        <div className="col grow" style={{ gap: 8, minWidth: 140 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <Swords size={16} color="var(--violet)" />
            Today&apos;s Mission
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{mp.pct}%</div>
          <p className="small muted" style={{ lineHeight: 1.5 }}>
            {missionLine(mp.done, mp.total)}
          </p>
          <Link to="/missions" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
            {mp.total === 0 ? "Plan today" : "View missions"} →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- (c) Streak card ---------- */

function StreakCard() {
  const xpByDay = useHeal((s) => s.xpByDay);
  const coins = useHeal((s) => s.coins);
  const streak = currentStreak({ xpByDay });
  const best = longestStreak({ xpByDay });
  const aliveToday = (xpByDay[todayISO()] ?? 0) > 0;

  return (
    <div className="card card-hover">
      <div className="card-title">
        <Flame size={16} color="var(--warning)" />
        Streak
      </div>
      <div className="row" style={{ gap: 14, marginBottom: 12 }}>
        <div
          style={{
            display: "inline-flex",
            padding: 14,
            borderRadius: "50%",
            background: "rgba(251, 191, 36, 0.12)",
            boxShadow: aliveToday ? "0 0 24px rgba(251, 191, 36, 0.25)" : "none",
          }}
        >
          <Flame
            size={30}
            color={streak > 0 ? "var(--warning)" : "var(--text-3)"}
            fill={aliveToday ? "var(--warning)" : "none"}
          />
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
            {streak}
            <span className="muted" style={{ fontSize: 15, fontWeight: 650 }}>
              {" "}
              day{streak === 1 ? "" : "s"}
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            {aliveToday
              ? "Flame secured for today."
              : streak > 0
                ? "Earn XP today to keep it alive!"
                : "Earn any XP to ignite a streak."}
          </div>
        </div>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="chip">
          <Trophy size={12} color="var(--violet)" />
          Best {best} day{best === 1 ? "" : "s"}
        </span>
        <span className="chip">
          <Coins size={12} color="var(--warning)" />
          {coins.toLocaleString()} coins
        </span>
      </div>
    </div>
  );
}

export function HeroRow() {
  return (
    <div className="grid grid-3">
      <LevelCard />
      <MissionProgressCard />
      <StreakCard />
    </div>
  );
}
