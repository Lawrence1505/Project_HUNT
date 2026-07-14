import { useMemo } from "react";
import {
  Coins,
  Crown,
  Flame,
  NotebookPen,
  Repeat,
  Swords,
  Timer,
  Zap,
} from "lucide-react";
import { useHeal } from "../../store/store";
import {
  currentStreak,
  habitSuccessRate,
  longestStreak,
} from "../../store/selectors";
import { levelFromXp, rankForLevel, titleForLevel } from "../../lib/xp";
import { formatShort, todayISO } from "../../lib/dates";
import { StatTile } from "../../components/ui";
import ContributionHeatmap from "./ContributionHeatmap";
import StatRadarCard from "./StatRadarCard";
import XpTrendCard from "./XpTrendCard";
import XpByStatCard from "./XpByStatCard";

export default function StatsPage() {
  const totalXp = useHeal((s) => s.totalXp);
  const coins = useHeal((s) => s.coins);
  const xpByDay = useHeal((s) => s.xpByDay);
  const missions = useHeal((s) => s.missions);
  const habits = useHeal((s) => s.habits);
  const journal = useHeal((s) => s.journal);
  const focusSessions = useHeal((s) => s.focusSessions);

  const level = levelFromXp(totalXp);
  const xpToday = xpByDay[todayISO()] ?? 0;

  const streak = useMemo(() => currentStreak({ xpByDay }), [xpByDay]);
  const longest = useMemo(() => longestStreak({ xpByDay }), [xpByDay]);

  const missionsDone = useMemo(
    () => missions.filter((m) => m.done).length,
    [missions]
  );

  const { focusHours, focusCount } = useMemo(() => {
    const minutes = focusSessions.reduce((a, f) => a + f.minutes, 0);
    return {
      focusHours: Math.round((minutes / 60) * 10) / 10,
      focusCount: focusSessions.length,
    };
  }, [focusSessions]);

  const { habitPct, activeHabitCount } = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    if (active.length === 0) return { habitPct: 0, activeHabitCount: 0 };
    const avg =
      active.reduce((a, h) => a + habitSuccessRate(h, 30), 0) / active.length;
    return { habitPct: Math.round(avg * 100), activeHabitCount: active.length };
  }, [habits]);

  const lastEntry = useMemo(
    () =>
      journal.length === 0
        ? null
        : journal.reduce((a, b) => (b.date > a.date ? b : a)),
    [journal]
  );

  return (
    <div className="page">
      <h1 className="page-title">Statistics</h1>
      <p className="page-subtitle">
        Your full performance record — every XP point, streak and stat in one
        place.
      </p>

      <div className="col" style={{ gap: 16 }}>
        {/* Summary tiles */}
        <div className="grid grid-4">
          <StatTile
            label="Total XP"
            value={totalXp.toLocaleString()}
            sub={xpToday > 0 ? `+${xpToday} XP today` : "No XP yet today"}
            icon={<Zap size={14} />}
            accent="var(--violet)"
          />
          <StatTile
            label="Level"
            value={`Lv ${level}`}
            sub={`${titleForLevel(level)} · Rank ${rankForLevel(level)}`}
            icon={<Crown size={14} />}
            accent="var(--blue)"
          />
          <StatTile
            label="Streak"
            value={`${streak}d`}
            sub={`Longest: ${longest}d`}
            icon={<Flame size={14} />}
            accent="var(--warning)"
          />
          <StatTile
            label="Missions Done"
            value={missionsDone}
            sub={
              missions.length > 0
                ? `of ${missions.length} created`
                : "No missions yet"
            }
            icon={<Swords size={14} />}
            accent="var(--success)"
          />
          <StatTile
            label="Focus Hours"
            value={`${focusHours}h`}
            sub={
              focusCount > 0
                ? `${focusCount} session${focusCount === 1 ? "" : "s"}`
                : "No sessions yet"
            }
            icon={<Timer size={14} />}
            accent="var(--cyan)"
          />
          <StatTile
            label="Habits 30d"
            value={`${habitPct}%`}
            sub={
              activeHabitCount > 0
                ? `across ${activeHabitCount} active habit${
                    activeHabitCount === 1 ? "" : "s"
                  }`
                : "No active habits"
            }
            icon={<Repeat size={14} />}
            accent="var(--violet)"
          />
          <StatTile
            label="Journal Entries"
            value={journal.length}
            sub={
              lastEntry ? `Last: ${formatShort(lastEntry.date)}` : "Start reflecting"
            }
            icon={<NotebookPen size={14} />}
            accent="var(--blue)"
          />
          <StatTile
            label="Coins"
            value={coins.toLocaleString()}
            sub="Lifetime earnings"
            icon={<Coins size={14} />}
            accent="var(--warning)"
          />
        </div>

        {/* Contribution heatmap — full width */}
        <ContributionHeatmap />

        {/* Radar + XP trend */}
        <div className="grid grid-2">
          <StatRadarCard />
          <XpTrendCard />
        </div>

        {/* XP by life stat — full width */}
        <XpByStatCard />
      </div>
    </div>
  );
}
