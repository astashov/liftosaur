import { JSX, Profiler, ProfilerOnRenderCallback, ReactNode } from "react";
import { PerfEnabled_tier2 } from "./perfEnabled";

interface IPerfProfilerProps {
  id: string;
  onRender: ProfilerOnRenderCallback;
  children: ReactNode;
}

// Profiler adds timing overhead to its entire subtree on every commit. Only the Tier-2 raw-trace
// cohort (~1% + dev) needs it, so for everyone else render the children directly. The tier decision
// is memoized per session, so this never toggles mid-session (no mount/unmount churn).
export function PerfProfiler(props: IPerfProfilerProps): JSX.Element {
  if (!PerfEnabled_tier2()) {
    return <>{props.children}</>;
  }
  return (
    <Profiler id={props.id} onRender={props.onRender}>
      {props.children}
    </Profiler>
  );
}
