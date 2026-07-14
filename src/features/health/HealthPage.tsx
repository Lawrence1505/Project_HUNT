import { SectionHeader } from "../../components/ui";
import { formatFull, todayISO } from "../../lib/dates";
import TodayPanel from "./TodayPanel";
import WeeklySummary from "./WeeklySummary";
import TrendCharts from "./TrendCharts";

/** Health hub — manual daily logging, weekly summary, 14/60-day trends. */
export default function HealthPage() {
  const today = todayISO();
  return (
    <div className="page">
      <h1 className="page-title">Health</h1>
      <p className="page-subtitle">
        Hydrate, sleep, move, breathe — your body is the first dungeon.
      </p>

      <section>
        <SectionHeader
          title="Today"
          action={<span className="small muted">{formatFull(today)}</span>}
        />
        <TodayPanel />
      </section>

      <section style={{ marginTop: 28 }}>
        <SectionHeader title="This week" />
        <WeeklySummary />
      </section>

      <section style={{ marginTop: 28 }}>
        <SectionHeader title="Trends" />
        <TrendCharts />
      </section>
    </div>
  );
}
