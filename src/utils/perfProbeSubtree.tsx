import { JSX, ReactNode, useLayoutEffect, useRef } from "react";
import { PerfProbe_isTarget, PerfProbe_onCommit } from "./perfSetCompleteProbe";

// TEMP DIAGNOSTIC (remove after investigation). Measures each wrapped subtree's render+commit
// contribution per tap WITHOUT React <Profiler>: the production RN renderer (ReactFabric-prod) strips
// Profiler onRender/timing entirely, so a Profiler-based probe silently emits nothing for the
// release-build users we need data from. Instead we bracket render-start → post-commit via
// useLayoutEffect (runs synchronously after the host tree commits, in every build). Coarser than
// Profiler's actualDuration, but enough to tell one big commit from a re-render storm from a
// mount-on-navigation.
export function PerfProbeSubtree(props: { id: string; children: ReactNode }): JSX.Element {
  // isTarget is stable for the whole session, so this branch never flips mid-session (no hook-count
  // churn) — non-target users render children directly with zero added hooks or overhead.
  if (!PerfProbe_isTarget()) {
    return <>{props.children}</>;
  }
  return <PerfProbeSubtreeActive id={props.id}>{props.children}</PerfProbeSubtreeActive>;
}

function PerfProbeSubtreeActive(props: { id: string; children: ReactNode }): JSX.Element {
  const renderStartRef = useRef(0);
  renderStartRef.current = Date.now();
  const mountedRef = useRef(false);
  useLayoutEffect(() => {
    const durationMs = Date.now() - renderStartRef.current;
    const phase = mountedRef.current ? "update" : "mount";
    mountedRef.current = true;
    PerfProbe_onCommit(props.id, phase, durationMs);
  });
  return <>{props.children}</>;
}
