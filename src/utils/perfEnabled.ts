import { PerfSampling_decide, IPerfSamplingDecision } from "./perfSampling";

declare let __DEV__: boolean;
declare const __PERF__: boolean | undefined;

// Decided once per session and memoized so a session never flips tier mid-run.
let cached: IPerfSamplingDecision | undefined;

function decision(): IPerfSamplingDecision {
  if (cached != null) {
    return cached;
  }
  if (__DEV__ || (typeof __PERF__ !== "undefined" && __PERF__ === true)) {
    cached = { tier1: true, tier2: true };
  } else {
    cached = PerfSampling_decide();
  }
  return cached;
}

// Tier 1: always-on scorecard (aggregated in memory, one lg() event per screen visit).
export function PerfEnabled_tier1(): boolean {
  return decision().tier1;
}

// Tier 2: raw per-event trace streamed to the network. Strict subset of Tier 1.
export function PerfEnabled_tier2(): boolean {
  return decision().tier2;
}

export function PerfEnabled_isEnabled(): boolean {
  const d = decision();
  return d.tier1 || d.tier2;
}
