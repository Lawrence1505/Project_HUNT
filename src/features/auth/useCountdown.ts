import { useEffect, useState } from "react";

function remaining(deadline: number | null): number {
  if (deadline === null) return 0;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

/**
 * Seconds remaining until `deadline` (epoch ms), ticking down to 0.
 * Returns 0 for a null or past deadline. Used for both the resend
 * cooldown (30 s) and the OTP expiry display (5:00).
 */
export function useCountdown(deadline: number | null): number {
  const [state, setState] = useState(() => ({ deadline, seconds: remaining(deadline) }));

  // Re-derive synchronously when the deadline changes so callers never see a
  // stale value for one render (React restarts the render on this setState).
  if (state.deadline !== deadline) {
    setState({ deadline, seconds: remaining(deadline) });
  }

  useEffect(() => {
    if (deadline === null) return;
    const id = window.setInterval(() => {
      const left = remaining(deadline);
      setState({ deadline, seconds: left });
      if (left <= 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  return state.seconds;
}

/** 300 → "5:00", 61 → "1:01". */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
