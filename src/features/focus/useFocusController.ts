import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHeal } from "../../store/store";
import { useFocusTimer, type TimerStatus } from "./useFocusTimer";

export type FocusMode = "pomodoro" | "short" | "long" | "deep";

export const FOCUS_MODES: readonly FocusMode[] = [
  "pomodoro",
  "short",
  "long",
  "deep",
];

export const MODE_LABEL: Record<FocusMode, string> = {
  pomodoro: "Pomodoro",
  short: "Short Break",
  long: "Long Break",
  deep: "Deep Work",
};

const POMODOROS_PER_CYCLE = 4;
const MIN_DEEP_LOG_SEC = 5 * 60;

/** "mm:ss" — minutes grow past 59 for long Deep Work sessions. */
export function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Short soft two-tone chime via WebAudio; silently no-ops if unavailable. */
function playChime(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(880, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
    osc.onended = () => {
      ctx.close().catch(() => undefined);
    };
  } catch {
    /* audio unavailable — stay silent */
  }
}

export interface FocusController {
  mode: FocusMode;
  status: TimerStatus;
  /** Remaining seconds for countdown modes, elapsed seconds for Deep Work. */
  seconds: number;
  /** 0..1 for the ring — elapsed/total, or a slow hourly cycle in Deep Work. */
  ringPct: number;
  label: string;
  setLabel: (v: string) => void;
  /** Pomodoros completed in the current 4-round cycle (0–4). */
  cycle: number;
  /** Suggested next mode after a completed session, if any. */
  suggestion: FocusMode | null;
  switchMode: (m: FocusMode) => void;
  start: () => void;
  /** Switch to a mode and start it immediately (suggestion / empty-state CTA). */
  startMode: (m: FocusMode) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** Stop Deep Work: logs if ≥ 5 min, otherwise discards with a toast. */
  finishDeep: () => void;
}

export function useFocusController(): FocusController {
  const pomodoroMin = useHeal((s) => s.settings.pomodoroMin);
  const shortBreakMin = useHeal((s) => s.settings.shortBreakMin);
  const longBreakMin = useHeal((s) => s.settings.longBreakMin);
  const logFocusSession = useHeal((s) => s.logFocusSession);
  const pushToast = useHeal((s) => s.pushToast);

  const [mode, setMode] = useState<FocusMode>("pomodoro");
  const [label, setLabel] = useState("");
  const [cycle, setCycle] = useState(0);
  const [suggestion, setSuggestion] = useState<FocusMode | null>(null);

  /** Countdown length locked in at start, so mid-run settings edits can't skew it. */
  const runTotalSecRef = useRef(0);

  // Freshest values for the completion handler (it fires from an interval).
  const snapRef = useRef({ mode, label, cycle });
  snapRef.current = { mode, label, cycle };

  const handleComplete = useCallback(() => {
    const { mode: m, label: l, cycle: c } = snapRef.current;
    playChime();
    if (m === "pomodoro") {
      logFocusSession(
        Math.round(runTotalSecRef.current / 60),
        "pomodoro",
        l.trim() || undefined
      );
      const done = Math.min(POMODOROS_PER_CYCLE, c + 1);
      setCycle(done);
      setSuggestion(done >= POMODOROS_PER_CYCLE ? "long" : "short");
    } else if (m === "short" || m === "long") {
      // Breaks never log sessions or award XP.
      if (m === "long") setCycle(0);
      setSuggestion("pomodoro");
      pushToast({
        kind: "info",
        title: "Break over",
        detail: "Recharged — time to dive back in.",
      });
    }
  }, [logFocusSession, pushToast]);

  const {
    status,
    seconds,
    start: timerStart,
    pause,
    resume,
    reset: timerReset,
    getElapsedSec,
  } = useFocusTimer(handleComplete);

  const durationMin = useCallback(
    (m: FocusMode): number =>
      m === "pomodoro"
        ? pomodoroMin
        : m === "short"
          ? shortBreakMin
          : m === "long"
            ? longBreakMin
            : 0,
    [pomodoroMin, shortBreakMin, longBreakMin]
  );

  const startMode = useCallback(
    (m: FocusMode) => {
      setMode(m);
      setSuggestion(null);
      if (m === "deep") {
        timerStart(0, true);
      } else {
        const total = Math.max(1, durationMin(m)) * 60;
        runTotalSecRef.current = total;
        timerStart(total, false);
      }
    },
    [durationMin, timerStart]
  );

  const start = useCallback(() => startMode(mode), [startMode, mode]);

  const switchMode = useCallback(
    (m: FocusMode) => {
      if (m === mode) return;
      if (status === "running" || status === "paused") {
        if (!window.confirm("Abandon the session in progress?")) return;
      }
      timerReset();
      setMode(m);
      setSuggestion(null);
    },
    [mode, status, timerReset]
  );

  const reset = useCallback(() => {
    if (status === "running" || status === "paused") {
      const elapsedSec =
        mode === "deep" ? getElapsedSec() : runTotalSecRef.current - seconds;
      if (
        elapsedSec >= 60 &&
        !window.confirm("Reset this session? Progress won't be logged.")
      ) {
        return;
      }
    }
    timerReset();
  }, [status, mode, seconds, getElapsedSec, timerReset]);

  const finishDeep = useCallback(() => {
    const elapsedSec = getElapsedSec();
    timerReset();
    if (elapsedSec >= MIN_DEEP_LOG_SEC) {
      logFocusSession(
        Math.floor(elapsedSec / 60),
        "deep",
        label.trim() || undefined
      );
    } else {
      pushToast({
        kind: "info",
        title: "Session discarded",
        detail: "Deep Work under 5 minutes isn't logged — go longer next time.",
      });
    }
  }, [getElapsedSec, timerReset, logFocusSession, pushToast, label]);

  // What the big clock shows: full duration when idle, remaining while
  // counting down, elapsed while in Deep Work.
  const displaySec =
    mode === "deep"
      ? seconds
      : status === "idle"
        ? durationMin(mode) * 60
        : seconds;

  const ringPct = useMemo(() => {
    if (mode === "deep") return (seconds % 3600) / 3600;
    if (status === "idle") return 0;
    if (status === "done") return 1;
    const total = Math.max(1, runTotalSecRef.current);
    return (total - seconds) / total;
  }, [mode, status, seconds]);

  // Live "mm:ss — HEAL" tab title while running; restore when stopped.
  const baseTitleRef = useRef(document.title);
  useEffect(() => {
    if (status === "running") {
      document.title = `${fmtClock(displaySec)} — HEAL`;
    } else if (status === "idle" || status === "done") {
      document.title = baseTitleRef.current;
    }
  }, [status, displaySec]);

  useEffect(() => {
    const base = baseTitleRef.current;
    return () => {
      document.title = base;
    };
  }, []);

  return {
    mode,
    status,
    seconds: displaySec,
    ringPct,
    label,
    setLabel,
    cycle,
    suggestion,
    switchMode,
    start,
    startMode,
    pause,
    resume,
    reset,
    finishDeep,
  };
}
