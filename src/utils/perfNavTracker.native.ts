import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_tier2 } from "./perfEnabled";

const PENDING_TAP_TTL_MS = 1000;

let lastScreen: string | undefined;
let pendingTapTs: number | null = null;
let pendingTapTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearPendingTap(): void {
  pendingTapTs = null;
  if (pendingTapTimeoutId != null) {
    clearTimeout(pendingTapTimeoutId);
    pendingTapTimeoutId = null;
  }
}

export function PerfNavTracker_recordTap(targetScreen: string): void {
  if (!PerfEnabled_tier2()) {
    return;
  }
  pendingTapTs = Date.now();
  if (pendingTapTimeoutId != null) {
    clearTimeout(pendingTapTimeoutId);
  }
  pendingTapTimeoutId = setTimeout(() => {
    clearPendingTap();
  }, PENDING_TAP_TTL_MS);
}

export function PerfNavTracker_handleStateChange(currentScreen: string | undefined): void {
  if (!PerfEnabled_tier2()) {
    return;
  }
  if (currentScreen == null) {
    return;
  }
  if (currentScreen === lastScreen) {
    return;
  }
  const from = lastScreen;
  lastScreen = currentScreen;
  const tap_ts = pendingTapTs ?? Date.now();
  clearPendingTap();
  PerfTracker_recordEvent({
    type: "nav",
    session: PerfTracker_getSessionId(),
    from,
    to: currentScreen,
    tap_ts,
  });
}
