import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { InteractionManager } from "react-native";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";

declare let __DEV__: boolean;

const AUTO_LOADED_STABLE_FRAMES = 8;

function emitMark(
  screen: string,
  phase: "mount" | "commit" | "interactive" | "loaded",
  loadedSource?: "auto" | "explicit"
): void {
  PerfTracker_recordEvent({
    type: "mark",
    session: PerfTracker_getSessionId(),
    screen,
    phase,
    ts: Date.now(),
    loaded_source: loadedSource,
  });
}

export function useScreenPerf(screenName: string): { markLoaded: () => void } {
  const loadedFiredRef = useRef(false);
  const commitCountRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    if (!__DEV__) {
      return;
    }
    emitMark(screenName, "mount");
  }, [screenName]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    emitMark(screenName, "commit");
    InteractionManager.runAfterInteractions(() => {
      if (!mountedRef.current) {
        return;
      }
      emitMark(screenName, "interactive");
    });
  }, [screenName]);

  useEffect(() => {
    commitCountRef.current += 1;
  });

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    let lastSeenCommit = commitCountRef.current;
    let stableFrames = 0;
    const tick = (): void => {
      if (loadedFiredRef.current || !mountedRef.current) {
        return;
      }
      if (commitCountRef.current !== lastSeenCommit) {
        lastSeenCommit = commitCountRef.current;
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }
      if (stableFrames >= AUTO_LOADED_STABLE_FRAMES) {
        loadedFiredRef.current = true;
        emitMark(screenName, "loaded", "auto");
        return;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [screenName]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const markLoaded = useCallback(() => {
    if (!__DEV__) {
      return;
    }
    if (loadedFiredRef.current) {
      return;
    }
    loadedFiredRef.current = true;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    emitMark(screenName, "loaded", "explicit");
  }, [screenName]);

  return { markLoaded };
}
