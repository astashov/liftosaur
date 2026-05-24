import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_isEnabled } from "./perfEnabled";

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
        PerfTracker_recordEvent({
          type: "longtask",
          session: PerfTracker_getSessionId(),
          duration: entry.duration,
          start: epochOffset + entry.startTime,
          screen: getCurrentScreen(),
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
