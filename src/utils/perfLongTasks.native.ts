import { AppState } from "react-native";
import { PerfTracker_recordEvent, PerfTracker_getSessionId, IPerfRecentAction } from "./perfTracker";
import { PerfEnabled_isEnabled } from "./perfEnabled";
import { PerfScorecard_recordLongTask } from "./perfScorecard";
import { Diagnostics_getLastActions } from "./diagnostics";

const RECENT_ACTIONS_COUNT = 5;
const DESC_MAX_LEN = 80;
// A JS long-task beyond this is an app suspend / OS-level hang, not user-perceived jank: iOS pauses
// the JS thread while backgrounded and reports the whole suspend as one giant "long-task" on resume.
// Unconditional backstop — mirrors SUSPEND_GAP_MS in the frame sampler.
const MAX_PLAUSIBLE_LONGTASK_MS = 10000;
// Right after a background/inactive transition, a long-task at least this long is the OS reporting the
// suspend gap and is dropped. Below it we keep recording: `inactive` also fires for transient
// interruptions (Control Center, permission prompts, the app-switcher peek) that emit no suspend gap,
// and a plausible long-task right after one of those is genuine jank we must not hide. Comfortably
// above the worst real synchronous freeze we see (~2s for FinishProgramDayAction).
const SUSPEND_LIKE_LONGTASK_MS = 3000;

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
  // Armed on the way out (background/inactive fires while the app is still executing, before it
  // suspends), so it's set before the resumed long-task is delivered — no cross-thread race. We
  // consume it on the very first long-task afterwards (whether or not we drop it), so a transient
  // `inactive` with no suspend gap can't leave it latched to eat a later, genuine foreground long-task.
  let armedForSuspend = false;
  const appStateSub = AppState.addEventListener("change", (next) => {
    if (next === "background" || next === "inactive") {
      armedForSuspend = true;
    }
  });
  let observer: { observe: (o: { entryTypes: string[] }) => void; disconnect: () => void };
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const wasArmed = armedForSuspend;
        armedForSuspend = false;
        if (entry.duration > MAX_PLAUSIBLE_LONGTASK_MS) {
          continue;
        }
        if (wasArmed && entry.duration >= SUSPEND_LIKE_LONGTASK_MS) {
          continue;
        }
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
    appStateSub.remove();
    return () => undefined;
  }
  return () => {
    appStateSub.remove();
    try {
      observer.disconnect();
    } catch {
      // ignore
    }
  };
}
