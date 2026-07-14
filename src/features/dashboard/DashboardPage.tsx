import { useHeal } from "../../store/store";
import { greeting } from "../../lib/dates";
import { HeroRow } from "./HeroRow";
import { LifeScoresRow } from "./LifeScoresRow";
import { TodayMissions, TodayHabits } from "./TodayPanel";
import { QuickLogCard, XpWeekCard } from "./QuickLog";
import { InsightsRow } from "./InsightsRow";

/**
 * Dashboard — the HEAL command center.
 * Hero row (level / today's mission / streak), life scores, today's
 * missions & habits with quick actions, quick health logging, a 7-day
 * XP chart, and daily quote + rule-based coach tips.
 */
export default function DashboardPage() {
  const name = useHeal((s) => s.settings.name);
  const avatar = useHeal((s) => s.settings.avatar);

  return (
    <div className="page">
      <h1 className="page-title">Command Center</h1>
      <p className="page-subtitle">
        {greeting()}, {name} {avatar} — here&apos;s your whole life at a glance.
      </p>

      <div className="col" style={{ gap: 16 }}>
        <HeroRow />
        <LifeScoresRow />

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="col" style={{ gap: 16 }}>
            <TodayMissions />
            <TodayHabits />
          </div>
          <div className="col" style={{ gap: 16 }}>
            <QuickLogCard />
            <XpWeekCard />
          </div>
        </div>

        <InsightsRow />
      </div>
    </div>
  );
}
