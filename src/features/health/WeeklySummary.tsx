import { Droplets, Dumbbell, Footprints, Moon } from "lucide-react";
import { useHeal } from "../../store/store";
import { lastNDates } from "../../lib/dates";
import { StatTile } from "../../components/ui";

/** Aggregate tiles for the last 7 days of health logs. */
export default function WeeklySummary() {
  const health = useHeal((s) => s.health);
  const settings = useHeal((s) => s.settings);
  const days = lastNDates(7);

  const sleepVals = days
    .map((d) => health[d]?.sleepHours)
    .filter((v): v is number => v != null);
  const avgSleep =
    sleepVals.length > 0
      ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length
      : null;

  const totalSteps = days.reduce((a, d) => a + (health[d]?.steps ?? 0), 0);
  const workoutDays = days.filter((d) => (health[d]?.workoutMin ?? 0) > 0).length;
  const workoutMins = days.reduce((a, d) => a + (health[d]?.workoutMin ?? 0), 0);
  const waterDays = days.filter(
    (d) => (health[d]?.water ?? 0) >= settings.waterTarget
  ).length;

  return (
    <div className="grid grid-4">
      <StatTile
        label="Avg sleep"
        icon={<Moon size={14} />}
        accent="var(--violet)"
        value={avgSleep != null ? `${avgSleep.toFixed(1)}h` : "—"}
        sub={
          avgSleep != null
            ? `target ${settings.sleepTarget}h · ${sleepVals.length}/7 nights logged`
            : "no nights logged yet"
        }
      />
      <StatTile
        label="Steps"
        icon={<Footprints size={14} />}
        accent="var(--blue)"
        value={totalSteps.toLocaleString()}
        sub="total · last 7 days"
      />
      <StatTile
        label="Workouts"
        icon={<Dumbbell size={14} />}
        accent="var(--cat-strength)"
        value={workoutDays}
        sub={`${workoutMins} min total`}
      />
      <StatTile
        label="Hydration"
        icon={<Droplets size={14} />}
        accent="var(--cyan)"
        value={`${waterDays}/7`}
        sub="days on target"
      />
    </div>
  );
}
