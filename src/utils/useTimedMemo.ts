import { useMemo, DependencyList } from "react";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_tier2 } from "./perfEnabled";

declare const performance: { now: () => number } | undefined;

const MIN_REPORT_MS = 1;

export function useTimedMemo<T>(label: string, fn: () => T, deps: DependencyList): T {
  return useMemo(() => {
    if (!PerfEnabled_tier2() || typeof performance === "undefined" || !performance.now) {
      return fn();
    }
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    if (duration >= MIN_REPORT_MS) {
      PerfTracker_recordEvent({
        type: "memo_timing",
        session: PerfTracker_getSessionId(),
        label,
        duration_ms: duration,
        ts: Date.now(),
      });
    }
    return result;
  }, deps);
}
