import { useEffect, useId, useState } from "react";
import { BadgeCheck, SlidersHorizontal } from "lucide-react";
import { useHeal } from "../../store/store";

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onCommit: (n: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= min && n <= max) {
      onCommit(n);
    }
  };

  const handleBlur = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== value) onCommit(clamped);
    setDraft(String(clamped));
  };

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {suffix ? <span style={{ textTransform: "none", opacity: 0.75 }}> · {suffix}</span> : null}
      </label>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}

export default function TargetsCard() {
  const settings = useHeal((s) => s.settings);
  const updateSettings = useHeal((s) => s.updateSettings);
  const currencyId = useId();

  return (
    <div className="card">
      <div className="card-title">
        <SlidersHorizontal size={16} style={{ color: "var(--violet)" }} />
        Targets &amp; Preferences
      </div>
      <p className="small muted" style={{ marginBottom: 16 }}>
        Tune your daily quest thresholds. Changes save instantly.
      </p>

      <div className="grid grid-2">
        <NumberField
          label="Water target"
          suffix="glasses/day"
          value={settings.waterTarget}
          min={1}
          max={30}
          onCommit={(n) => updateSettings({ waterTarget: n })}
        />
        <NumberField
          label="Sleep target"
          suffix="h/night"
          value={settings.sleepTarget}
          min={4}
          max={14}
          step={0.5}
          onCommit={(n) => updateSettings({ sleepTarget: n })}
        />
        <NumberField
          label="Steps target"
          suffix="steps/day"
          value={settings.stepsTarget}
          min={1000}
          max={60000}
          step={500}
          onCommit={(n) => updateSettings({ stepsTarget: n })}
        />
        <NumberField
          label="Focus target"
          suffix="min/day"
          value={settings.focusTarget}
          min={10}
          max={720}
          step={5}
          onCommit={(n) => updateSettings({ focusTarget: n })}
        />
        <NumberField
          label="Pomodoro"
          suffix="min"
          value={settings.pomodoroMin}
          min={5}
          max={120}
          onCommit={(n) => updateSettings({ pomodoroMin: n })}
        />
        <NumberField
          label="Short break"
          suffix="min"
          value={settings.shortBreakMin}
          min={1}
          max={60}
          onCommit={(n) => updateSettings({ shortBreakMin: n })}
        />
        <NumberField
          label="Long break"
          suffix="min"
          value={settings.longBreakMin}
          min={5}
          max={90}
          onCommit={(n) => updateSettings({ longBreakMin: n })}
        />
        <div>
          <label className="label" htmlFor={currencyId}>
            Currency <span style={{ textTransform: "none", opacity: 0.75 }}>· symbol</span>
          </label>
          <input
            id={currencyId}
            className="input"
            type="text"
            maxLength={3}
            value={settings.currency}
            placeholder="$"
            onChange={(e) => updateSettings({ currency: e.target.value })}
            onBlur={() => {
              if (!settings.currency.trim()) updateSettings({ currency: "$" });
            }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 16, color: "var(--success)" }}>
        <BadgeCheck size={14} />
        <span className="small">Saved automatically</span>
      </div>
    </div>
  );
}
