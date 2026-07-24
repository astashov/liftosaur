import { useEffect } from "react";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_tier2 } from "./perfEnabled";

export function usePerfRenderTrace(componentName: string): void {
  useEffect(() => {
    if (!PerfEnabled_tier2()) {
      return;
    }
    PerfTracker_recordEvent({
      type: "render_trace",
      session: PerfTracker_getSessionId(),
      component: componentName,
      ts: Date.now(),
    });
  });
}
