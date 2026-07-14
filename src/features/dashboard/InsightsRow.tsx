import { Link } from "react-router-dom";
import {
  Bot,
  Droplets,
  Flame,
  PartyPopper,
  Quote,
  Sparkles,
  Swords,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHeal } from "../../store/store";
import {
  currentStreak,
  habitStreak,
  todayMissionProgress,
} from "../../store/selectors";
import { todayISO } from "../../lib/dates";
import { quoteOfTheDay } from "./quotes";

/* ---------- Quote of the Day ---------- */

export function QuoteCard() {
  const quote = quoteOfTheDay();
  return (
    <div className="card card-hover">
      <div className="card-title">
        <Quote size={16} color="var(--cyan)" />
        Quote of the Day
      </div>
      <blockquote
        style={{
          fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: 17.5,
          lineHeight: 1.65,
          color: "var(--text-1)",
          margin: "6px 0 10px",
          paddingLeft: 14,
          borderLeft: "3px solid var(--violet)",
        }}
      >
        “{quote.text}”
      </blockquote>
      <div
        className="small muted"
        style={{
          textAlign: "right",
          fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
        }}
      >
        — {quote.author}
      </div>
    </div>
  );
}

/* ---------- Coach's Tip ---------- */

interface Tip {
  id: string;
  icon: LucideIcon;
  color: string;
  text: string;
}

function useCoachTips(): Tip[] {
  const missions = useHeal((s) => s.missions);
  const habits = useHeal((s) => s.habits);
  const xpByDay = useHeal((s) => s.xpByDay);
  const health = useHeal((s) => s.health);
  const waterTarget = useHeal((s) => s.settings.waterTarget);

  const today = todayISO();
  const tips: Tip[] = [];

  // 1. Streak about to break — most urgent.
  const streak = currentStreak({ xpByDay });
  if ((xpByDay[today] ?? 0) === 0 && streak > 0) {
    tips.push({
      id: "streak-risk",
      icon: Flame,
      color: "var(--danger)",
      text: `Your ${streak}-day streak is on the line. Earn any XP today — even one easy mission keeps the flame alive.`,
    });
  }

  // 2. Empty quest log — plan the day.
  if (todayMissionProgress({ missions }).total === 0) {
    tips.push({
      id: "plan-day",
      icon: Swords,
      color: "var(--violet)",
      text: "Your quest log is empty. Plan 1–3 missions to give today a clear direction.",
    });
  }

  // 3. Hydration lagging after noon.
  const water = health[today]?.water ?? 0;
  if (new Date().getHours() >= 12 && water < waterTarget / 2) {
    tips.push({
      id: "hydrate",
      icon: Droplets,
      color: "var(--cyan)",
      text: `Only ${water}/${waterTarget} glasses of water so far — hydration fuels focus. Grab one now.`,
    });
  }

  // 4. Celebrate a hot habit streak.
  const hot = habits
    .filter((h) => !h.archived)
    .map((h) => ({ name: h.name, streak: habitStreak(h) }))
    .filter((x) => x.streak >= 7)
    .sort((a, b) => b.streak - a.streak)[0];
  if (hot) {
    tips.push({
      id: "hot-habit",
      icon: PartyPopper,
      color: "var(--success)",
      text: `"${hot.name}" is on a ${hot.streak}-day streak — consistency like this is how legends are built.`,
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "all-green",
      icon: Sparkles,
      color: "var(--success)",
      text: "All systems green. Stack one more win before the day ends — future you will notice.",
    });
  }

  return tips.slice(0, 3);
}

export function CoachTipCard() {
  const tips = useCoachTips();
  return (
    <div className="card card-hover">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          <Bot size={16} color="var(--blue)" />
          Coach&apos;s Tip
        </div>
        <Link to="/coach" className="btn btn-ghost btn-sm">
          Open AI Coach →
        </Link>
      </div>
      <div className="col" style={{ gap: 12 }}>
        {tips.map((tip) => {
          const Icon = tip.icon;
          return (
            <div key={tip.id} className="row" style={{ alignItems: "flex-start" }}>
              <span
                style={{
                  display: "inline-flex",
                  padding: 8,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${tip.color} 14%, transparent)`,
                  color: tip.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={15} />
              </span>
              <p className="small" style={{ lineHeight: 1.55, color: "var(--text-2)" }}>
                {tip.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InsightsRow() {
  return (
    <div className="grid grid-2">
      <QuoteCard />
      <CoachTipCard />
    </div>
  );
}
