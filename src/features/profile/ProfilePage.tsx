import { Sparkles } from "lucide-react";
import { SectionHeader } from "../../components/ui";
import HeroCard from "./HeroCard";
import StatsBoard from "./StatsBoard";
import TargetsCard from "./TargetsCard";
import DataCard from "./DataCard";

function AboutCard() {
  return (
    <div className="card">
      <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
        <span
          style={{
            display: "inline-flex",
            padding: 10,
            borderRadius: "var(--radius-md)",
            background: "color-mix(in srgb, var(--violet) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--violet) 30%, transparent)",
            color: "var(--violet)",
          }}
        >
          <Sparkles size={18} />
        </span>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <span className="gradient-text" style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.05em" }}>
              HEAL
            </span>
            <span className="chip mono">v0.1</span>
          </div>
          <div className="small" style={{ color: "var(--text-2)", marginTop: 2, fontStyle: "italic" }}>
            "Heal Yourself. Level Your Life."
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Offline-first: everything is stored locally in your browser — no account, no cloud, no
            tracking. Export a backup before switching devices.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">
        Your hunter license — identity, stat board, targets and data control.
      </p>

      <div className="col" style={{ gap: 24 }}>
        <HeroCard />

        <section>
          <SectionHeader title="Stat Board" />
          <StatsBoard />
        </section>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <TargetsCard />
          <div className="col" style={{ gap: 16 }}>
            <DataCard />
            <AboutCard />
          </div>
        </div>
      </div>
    </div>
  );
}
