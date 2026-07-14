import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
} from "lucide-react";
import { useHeal } from "../../store/store";
import { Modal, ProgressRing } from "../../components/ui";
import {
  FOCUS_MODES,
  MODE_LABEL,
  fmtClock,
  type FocusController,
  type FocusMode,
} from "./useFocusController";

const SUGGESTION_TEXT: Record<FocusMode, string> = {
  pomodoro: "Break's over — ready for the next round?",
  short: "Pomodoro complete! A short break keeps you sharp.",
  long: "Four pomodoros down — you've earned a long break.",
  deep: "",
};

interface DurationsDraft {
  pomodoro: string;
  short: string;
  long: string;
  target: string;
}

export default function TimerCard({ c }: { c: FocusController }) {
  const settings = useHeal((s) => s.settings);
  const updateSettings = useHeal((s) => s.updateSettings);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<DurationsDraft>({
    pomodoro: "25",
    short: "5",
    long: "15",
    target: "120",
  });

  const openSettings = () => {
    setDraft({
      pomodoro: String(settings.pomodoroMin),
      short: String(settings.shortBreakMin),
      long: String(settings.longBreakMin),
      target: String(settings.focusTarget),
    });
    setSettingsOpen(true);
  };

  const saveSettings = (e: FormEvent) => {
    e.preventDefault();
    const clamp = (v: string, lo: number, hi: number, fallback: number) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) && n >= lo ? Math.min(hi, n) : fallback;
    };
    updateSettings({
      pomodoroMin: clamp(draft.pomodoro, 1, 180, settings.pomodoroMin),
      shortBreakMin: clamp(draft.short, 1, 60, settings.shortBreakMin),
      longBreakMin: clamp(draft.long, 1, 120, settings.longBreakMin),
      focusTarget: clamp(draft.target, 5, 960, settings.focusTarget),
    });
    setSettingsOpen(false);
  };

  const active = c.status === "running" || c.status === "paused";
  const suggested = c.suggestion;

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
    >
      <div className="row-between wrap" style={{ width: "100%" }}>
        <div className="tabs">
          {FOCUS_MODES.map((m) => (
            <button
              key={m}
              className={c.mode === m ? "tab active" : "tab"}
              onClick={() => c.switchMode(m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={openSettings}
          aria-label="Edit focus durations"
          title="Durations"
        >
          <Settings2 size={17} />
        </button>
      </div>

      <ProgressRing pct={c.ringPct} size={260} stroke={12}>
        <div
          className="mono"
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtClock(c.seconds)}
        </div>
        <div
          className="small muted"
          style={{
            marginTop: 4,
            maxWidth: 180,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.status === "paused"
            ? "Paused"
            : c.label.trim() || MODE_LABEL[c.mode]}
        </div>
      </ProgressRing>

      <div className="row wrap" style={{ justifyContent: "center" }}>
        {(c.status === "idle" || c.status === "done") && (
          <button className="btn btn-primary" onClick={c.start}>
            <Play size={16} /> Start
          </button>
        )}
        {c.status === "running" && (
          <button className="btn" onClick={c.pause}>
            <Pause size={16} /> Pause
          </button>
        )}
        {c.status === "paused" && (
          <button className="btn btn-primary" onClick={c.resume}>
            <Play size={16} /> Resume
          </button>
        )}
        {c.mode === "deep" && active && (
          <button className="btn btn-primary" onClick={c.finishDeep}>
            <Square size={14} /> Finish
          </button>
        )}
        {active && (
          <button className="btn btn-ghost" onClick={c.reset}>
            <RotateCcw size={15} /> Reset
          </button>
        )}
      </div>

      <input
        className="input"
        style={{ maxWidth: 340, textAlign: "center" }}
        placeholder="What are you working on?"
        value={c.label}
        onChange={(e) => c.setLabel(e.target.value)}
        maxLength={80}
      />

      {c.mode !== "deep" && (
        <div
          className="row"
          style={{ gap: 7 }}
          title={`${c.cycle} of 4 pomodoros this cycle`}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                background:
                  i < c.cycle ? "var(--violet)" : "rgba(255,255,255,0.14)",
                boxShadow:
                  i < c.cycle ? "0 0 10px rgba(139,92,246,0.7)" : "none",
                transition: "all 300ms var(--ease-out)",
              }}
            />
          ))}
          <span className="small muted" style={{ marginLeft: 4 }}>
            {c.cycle}/4 this cycle
          </span>
        </div>
      )}

      {suggested && (
        <div
          className="row wrap"
          style={{
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span className="small muted">{SUGGESTION_TEXT[suggested]}</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => c.startMode(suggested)}
          >
            {MODE_LABEL[suggested]} <ArrowRight size={13} />
          </button>
        </div>
      )}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Focus durations"
      >
        <form onSubmit={saveSettings} className="col">
          <div className="grid grid-2">
            <div>
              <label className="label" htmlFor="focus-dur-pomo">
                Pomodoro (min)
              </label>
              <input
                id="focus-dur-pomo"
                className="input"
                type="number"
                min={1}
                max={180}
                value={draft.pomodoro}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, pomodoro: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="focus-dur-short">
                Short break (min)
              </label>
              <input
                id="focus-dur-short"
                className="input"
                type="number"
                min={1}
                max={60}
                value={draft.short}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, short: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="focus-dur-long">
                Long break (min)
              </label>
              <input
                id="focus-dur-long"
                className="input"
                type="number"
                min={1}
                max={120}
                value={draft.long}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, long: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="focus-dur-target">
                Daily target (min)
              </label>
              <input
                id="focus-dur-target"
                className="input"
                type="number"
                min={5}
                max={960}
                value={draft.target}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, target: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSettingsOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
