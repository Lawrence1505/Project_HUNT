import { useCallback, useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused" | "done";

/**
 * Drift-free timer primitive.
 *
 * Countdown sessions anchor an absolute `endAt` timestamp and stopwatch
 * sessions anchor `startAt`; the 250ms interval only *derives* the displayed
 * seconds from `Date.now()`, so background-tab throttling or a slow event
 * loop can never skew the clock.
 */
export function useFocusTimer(onComplete: () => void) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [seconds, setSeconds] = useState(0);

  const endAtRef = useRef(0); // countdown target (epoch ms)
  const startAtRef = useRef(0); // stopwatch anchor (epoch ms)
  const pausedSecRef = useRef(0); // remaining/elapsed seconds frozen on pause
  const countUpRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // Always call the freshest completion handler from inside the interval.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    if (countUpRef.current) {
      setSeconds(Math.max(0, Math.floor((now - startAtRef.current) / 1000)));
      return;
    }
    const msLeft = endAtRef.current - now;
    setSeconds(Math.max(0, Math.ceil(msLeft / 1000)));
    if (msLeft <= 0) {
      clearTick();
      setStatus("done");
      onCompleteRef.current();
    }
  }, [clearTick]);

  const beginTicking = useCallback(() => {
    clearTick();
    intervalRef.current = window.setInterval(tick, 250);
  }, [clearTick, tick]);

  /** Start fresh: countdown from `totalSec`, or a stopwatch when `countUp`. */
  const start = useCallback(
    (totalSec: number, countUp: boolean) => {
      countUpRef.current = countUp;
      pausedSecRef.current = 0;
      if (countUp) {
        startAtRef.current = Date.now();
        setSeconds(0);
      } else {
        endAtRef.current = Date.now() + totalSec * 1000;
        setSeconds(totalSec);
      }
      setStatus("running");
      beginTicking();
    },
    [beginTicking]
  );

  const pause = useCallback(() => {
    const now = Date.now();
    pausedSecRef.current = countUpRef.current
      ? Math.max(0, (now - startAtRef.current) / 1000)
      : Math.max(0, (endAtRef.current - now) / 1000);
    clearTick();
    setStatus("paused");
  }, [clearTick]);

  const resume = useCallback(() => {
    const now = Date.now();
    if (countUpRef.current) {
      startAtRef.current = now - pausedSecRef.current * 1000;
    } else {
      endAtRef.current = now + pausedSecRef.current * 1000;
    }
    setStatus("running");
    beginTicking();
  }, [beginTicking]);

  const reset = useCallback(() => {
    clearTick();
    pausedSecRef.current = 0;
    setStatus("idle");
    setSeconds(0);
  }, [clearTick]);

  /** Exact elapsed seconds of a count-up session (running or paused). */
  const getElapsedSec = useCallback((): number => {
    if (!countUpRef.current) return 0;
    if (intervalRef.current !== null) {
      return Math.max(0, (Date.now() - startAtRef.current) / 1000);
    }
    return pausedSecRef.current;
  }, []);

  // Kill the interval on unmount.
  useEffect(() => clearTick, [clearTick]);

  return { status, seconds, start, pause, resume, reset, getElapsedSec };
}
