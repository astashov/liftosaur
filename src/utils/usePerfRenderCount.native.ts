import { useEffect, useRef } from "react";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_tier2 } from "./perfEnabled";

const WINDOW_MS = 3000;

export function usePerfRenderCount(componentName: string): void {
  const totalRef = useRef(0);
  const lastEmittedRef = useRef(0);
  totalRef.current += 1;

  useEffect(() => {
    if (!PerfEnabled_tier2()) {
      return;
    }
    const interval = setInterval(() => {
      const total = totalRef.current;
      const delta = total - lastEmittedRef.current;
      if (delta <= 0) {
        return;
      }
      lastEmittedRef.current = total;
      PerfTracker_recordEvent({
        type: "render_count",
        session: PerfTracker_getSessionId(),
        component: componentName,
        delta,
        total,
        window_ms: WINDOW_MS,
        ts: Date.now(),
      });
    }, WINDOW_MS);
    return () => clearInterval(interval);
  }, [componentName]);
}
