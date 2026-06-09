import { useEffect, useRef } from "react";
import { useFrameCallback, useSharedValue, runOnJS } from "react-native-reanimated";
import { PerfTracker_recordEvent, PerfTracker_getSessionId, IPerfFrameWindow } from "./perfTracker";
import { PerfEnabled_isEnabled, PerfEnabled_tier2 } from "./perfEnabled";

// Absolute, display-agnostic thresholds: a 120Hz ProMotion display renders ~8.3ms frames, so a
// fixed 60Hz budget would flag normal frames as "slow". 33ms = at least one missed 60Hz frame.
const SLOW_FRAME_MS = 33;
const FROZEN_FRAME_MS = 700;
const SUMMARY_INTERVAL_MS = 1000;

let registeredDrain: ((screenOverride?: string) => void) | undefined;

// Drain the in-progress frame window right now. Called on screen change / app background BEFORE the
// scorecard rotates, so the partial window's frames are attributed to the screen that produced them
// (the still-current aggregate) and aren't lost waiting for the next 1s tick. screenOverride labels
// the drained window with the screen that produced it — on navigation getCurrentScreen() already
// reads the new route, which would otherwise mislabel the Tier-2 raw frame_summary.
export function PerfFrameSampler_flush(screenOverride?: string): void {
  registeredDrain?.(screenOverride);
}

export function usePerfFrameSampling(
  active: boolean,
  getCurrentScreen: () => string | undefined,
  onWindow?: (window: IPerfFrameWindow) => void
): void {
  const getCurrentScreenRef = useRef(getCurrentScreen);
  getCurrentScreenRef.current = getCurrentScreen;
  const onWindowRef = useRef(onWindow);
  onWindowRef.current = onWindow;

  const framesTotal = useSharedValue(0);
  const framesSlow = useSharedValue(0);
  const framesFrozen = useSharedValue(0);
  const maxGapMs = useSharedValue(0);
  const lastTotalRef = useRef(0);
  const lastSlowRef = useRef(0);
  const lastFrozenRef = useRef(0);

  function recordFrozen(gapMs: number): void {
    if (!PerfEnabled_tier2()) {
      return;
    }
    PerfTracker_recordEvent({
      type: "framedrop",
      session: PerfTracker_getSessionId(),
      thread: "ui",
      gap_ms: gapMs,
      expected_ms: SLOW_FRAME_MS,
      screen: getCurrentScreenRef.current(),
      ts: Date.now(),
    });
  }

  // Accumulate per-frame on the UI thread; only hop to JS once per second (or per rare frozen
  // frame). The previous implementation called runOnJS for every dropped frame, piling work onto
  // the already-saturated JS thread during the exact moment it was janky.
  const frameCallback = useFrameCallback((frameInfo) => {
    "worklet";
    const gap = frameInfo.timeSincePreviousFrame;
    if (gap == null) {
      return;
    }
    framesTotal.value += 1;
    if (gap > FROZEN_FRAME_MS) {
      framesFrozen.value += 1;
      runOnJS(recordFrozen)(gap);
    } else if (gap > SLOW_FRAME_MS) {
      framesSlow.value += 1;
    }
    if (gap > maxGapMs.value) {
      maxGapMs.value = gap;
    }
  }, false);

  useEffect(() => {
    if (!PerfEnabled_isEnabled() || !active) {
      frameCallback.setActive(false);
      return;
    }
    frameCallback.setActive(true);
    lastTotalRef.current = framesTotal.value;
    lastSlowRef.current = framesSlow.value;
    lastFrozenRef.current = framesFrozen.value;

    function drain(screenOverride?: string): void {
      const total = framesTotal.value - lastTotalRef.current;
      const slow = framesSlow.value - lastSlowRef.current;
      const frozen = framesFrozen.value - lastFrozenRef.current;
      const maxGap = maxGapMs.value;
      maxGapMs.value = 0;
      lastTotalRef.current = framesTotal.value;
      lastSlowRef.current = framesSlow.value;
      lastFrozenRef.current = framesFrozen.value;
      if (total <= 0) {
        return;
      }
      const window: IPerfFrameWindow = {
        screen: screenOverride ?? getCurrentScreenRef.current(),
        frames_total: total,
        frames_slow: slow,
        frames_frozen: frozen,
        max_gap_ms: Math.round(maxGap),
        window_ms: SUMMARY_INTERVAL_MS,
        ts: Date.now(),
      };
      // Tier 1: in-memory aggregation (the scorecard rolls this into one lg() per screen visit).
      onWindowRef.current?.(window);
      // Tier 2 only: stream the raw per-second summary to the network trace.
      if (PerfEnabled_tier2()) {
        PerfTracker_recordEvent({ type: "frame_summary", session: PerfTracker_getSessionId(), ...window });
      }
    }

    registeredDrain = drain;
    const interval = setInterval(drain, SUMMARY_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (registeredDrain === drain) {
        registeredDrain = undefined;
      }
      frameCallback.setActive(false);
    };
  }, [active, frameCallback, framesTotal, framesSlow, framesFrozen, maxGapMs]);
}
