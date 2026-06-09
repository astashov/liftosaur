import { PerfTracker_recordEvent, PerfTracker_getSessionId, IPerfRecentAction } from "./perfTracker";
import { PerfEnabled_isEnabled } from "./perfEnabled";
import { PerfScorecard_recordLongTask } from "./perfScorecard";
import { Diagnostics_getLastActions } from "./diagnostics";

const RECENT_ACTIONS_COUNT = 5;
const DESC_MAX_LEN = 80;

// PII-safe: only the dev-written type/desc label and the action's age relative to the long-task —
// never the raw action object (which spreads user payloads). age_ms separates cause (a few ms before
// the task) from coincidence (a stale action from seconds ago).
function recentActionsSnapshot(beforeEpochMs: number): IPerfRecentAction[] {
  return Diagnostics_getLastActions()
    .slice(0, RECENT_ACTIONS_COUNT)
    .map((a) => ({
      type: a.type,
      desc: typeof a.desc === "string" ? a.desc.slice(0, DESC_MAX_LEN) : undefined,
      age_ms: typeof a.ts === "number" ? Math.max(0, Math.round(beforeEpochMs - a.ts)) : -1,
    }));
}

declare const PerformanceObserver: {
  prototype: { observe: (options: { entryTypes: string[] }) => void; disconnect: () => void };
  new (callback: (list: { getEntries: () => Array<{ duration: number; startTime: number }> }) => void): {
    observe: (options: { entryTypes: string[] }) => void;
    disconnect: () => void;
  };
};

declare const performance: { now: () => number } | undefined;

export function PerfLongTasks_start(getCurrentScreen: () => string | undefined): () => void {
  if (!PerfEnabled_isEnabled()) {
    return () => undefined;
  }
  if (typeof PerformanceObserver === "undefined") {
    return () => undefined;
  }
  // PerformanceObserver entry.startTime is relative to the JS runtime origin (performance.timeOrigin),
  // not Date.now()'s epoch. Capture the offset once so we can normalize all events to epoch ms.
  const perfNowAtInit = typeof performance !== "undefined" && performance.now ? performance.now() : 0;
  const epochOffset = Date.now() - perfNowAtInit;
  let observer: { observe: (o: { entryTypes: string[] }) => void; disconnect: () => void };
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const screen = getCurrentScreen();
        const start = epochOffset + entry.startTime;
        const recent = recentActionsSnapshot(start);
        PerfScorecard_recordLongTask(entry.duration, screen, recent);
        PerfTracker_recordEvent({
          type: "longtask",
          session: PerfTracker_getSessionId(),
          duration: entry.duration,
          start,
          screen,
          recent,
        });
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    return () => undefined;
  }
  return () => {
    try {
      observer.disconnect();
    } catch {
      // ignore
    }
  };
}
