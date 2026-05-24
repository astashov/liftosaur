import { useEffect, useRef } from "react";
import { useFrameCallback, runOnJS } from "react-native-reanimated";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_isEnabled } from "./perfEnabled";

const EXPECTED_FRAME_MS_60HZ = 16.67;
const DROP_THRESHOLD_MULTIPLIER = 1.5;

export function usePerfFrameSampling(active: boolean, getCurrentScreen: () => string | undefined): void {
  const getCurrentScreenRef = useRef(getCurrentScreen);
  getCurrentScreenRef.current = getCurrentScreen;

  const expected = EXPECTED_FRAME_MS_60HZ;
  const threshold = expected * DROP_THRESHOLD_MULTIPLIER;

  function handleDrop(gapMs: number): void {
    PerfTracker_recordEvent({
      type: "framedrop",
      session: PerfTracker_getSessionId(),
      thread: "ui",
      gap_ms: gapMs,
      expected_ms: expected,
      screen: getCurrentScreenRef.current(),
      ts: Date.now(),
    });
  }

  const frameCallback = useFrameCallback((frameInfo) => {
    "worklet";
    const gap = frameInfo.timeSincePreviousFrame;
    if (gap == null) {
      return;
    }
    if (gap > threshold) {
      runOnJS(handleDrop)(gap);
    }
  }, false);

  useEffect(() => {
    if (!PerfEnabled_isEnabled()) {
      return;
    }
    frameCallback.setActive(active);
  }, [active, frameCallback]);
}
