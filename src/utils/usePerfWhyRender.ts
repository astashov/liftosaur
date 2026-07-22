import { useLayoutEffect, useRef } from "react";
import { PerfProbe_isTarget, PerfProbe_isRecording, PerfProbe_recordRender } from "./perfSetCompleteProbe";
import { ObjectUtils_diffPaths } from "./object";

// Props whose values are large collections: a reference change is all we need to know, and a deep diff
// of e.g. full history would itself be a multi-second cost. Never descend into these.
const SKIP_DEEP = new Set(["history", "programs", "stats", "children"]);
const MAX_PATHS = 6;

// TEMP DIAGNOSTIC (remove after investigation). Placed in a MEMOIZED component so its useLayoutEffect
// only runs when React actually re-rendered AND committed it (the memo did not bail, and the render
// wasn't discarded by a concurrent retry). The diff/record/baseline-update all happen post-commit, so
// abandoned renders can't emit telemetry or poison the "previous props" baseline. On each committed
// re-render it diffs current vs previous props by reference to name which prop broke the memo, and runs
// ObjectUtils_diffPaths on object props to report the exact changed value paths — or "<ref-only>" when
// the reference changed but no value did (spurious churn = the memo-killer). No-op unless the device's
// tempUserId is a target, and the deep diff only runs while a tap window is open.
export function usePerfWhyRender(component: string, props: Record<string, unknown>): void {
  const prevRef = useRef<Record<string, unknown> | undefined>(undefined);
  useLayoutEffect(() => {
    if (!PerfProbe_isTarget()) {
      return;
    }
    const prev = prevRef.current;
    // Skip the mount (no previous props to diff); only report actual re-renders that happen in a window.
    if (prev !== undefined && PerfProbe_isRecording()) {
      const changed: string[] = [];
      const seen = new Set<string>();
      for (const k of Object.keys(props)) {
        seen.add(k);
        const a = prev[k];
        const b = props[k];
        if (a === b) {
          continue;
        }
        if (!SKIP_DEEP.has(k) && a != null && b != null && typeof a === "object" && typeof b === "object") {
          const paths = ObjectUtils_diffPaths(a as object, b as object);
          changed.push(paths.length === 0 ? `${k}:<ref-only>` : `${k}:${paths.slice(0, MAX_PATHS).join("|")}`);
        } else {
          changed.push(k);
        }
      }
      for (const k of Object.keys(prev)) {
        if (!seen.has(k)) {
          changed.push(k);
        }
      }
      PerfProbe_recordRender(component, changed);
    }
    prevRef.current = props;
  });
}
