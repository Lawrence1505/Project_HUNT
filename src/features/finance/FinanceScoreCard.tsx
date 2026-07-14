import { Gauge } from "lucide-react";
import { ProgressRing, SectionHeader } from "../../components/ui";

function verdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "S-Rank Saver", color: "var(--success)" };
  if (score >= 60) return { label: "Disciplined", color: "var(--cyan)" };
  if (score >= 40) return { label: "Holding steady", color: "var(--warning)" };
  if (score > 0) return { label: "Leaking gold", color: "var(--danger)" };
  return { label: "No data yet", color: "var(--text-3)" };
}

export default function FinanceScoreCard({ score }: { score: number }) {
  const v = verdict(score);
  return (
    <div className="card card-hover">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <Gauge size={17} style={{ color: "var(--cyan)" }} />
            Finance Score
          </span>
        }
        action={
          <span
            className="chip"
            style={{
              color: v.color,
              borderColor: `color-mix(in srgb, ${v.color} 40%, transparent)`,
            }}
          >
            {v.label}
          </span>
        }
      />
      <div className="row wrap" style={{ gap: 18 }}>
        <ProgressRing pct={score / 100} size={104} stroke={9}>
          <span style={{ fontSize: 26, fontWeight: 700 }} className="gradient-text">
            {score}
          </span>
          <span className="small muted">/ 100</span>
        </ProgressRing>
        <div className="col grow" style={{ gap: 6, minWidth: 160 }}>
          <p className="small" style={{ color: "var(--text-2)" }}>
            Savings rate (60%) + budget adherence (40%), scored on the current month.
          </p>
          <p className="small muted">
            Keep spending under your limits and bank part of every income to push this higher.
          </p>
        </div>
      </div>
    </div>
  );
}
