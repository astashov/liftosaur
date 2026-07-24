export interface IPerfSamplingDecision {
  tier1: boolean;
  tier2: boolean;
}

// OTA-tunable: these are the single source of truth for how many production sessions report perf
// data. Changing them ships in a normal JS bundle (no store release). Tier 2 is a strict subset of
// Tier 1 (same uniform draw), so every raw-trace session also produces a scorecard.
// Temporarily 1.0 for an initial characterization bake (full long-tail resolution). Drop back to
// ~0.1–0.25 for steady-state monitoring once the shape of the problem is known.
const TIER1_RATE = 1.0;
// Tier 2 (raw per-event stream to /api/_dev/perf) is deferred until that backend handler exists, so
// it is disabled in production. Dev still gets it via the __DEV__ override in perfEnabled.ts. Set
// this to e.g. 0.01 once the endpoint is built.
const TIER2_RATE = 0;
const KILL_SWITCH = false;

export function PerfSampling_decideFor(unit: number): IPerfSamplingDecision {
  if (KILL_SWITCH) {
    return { tier1: false, tier2: false };
  }
  return { tier1: unit < TIER1_RATE, tier2: unit < TIER2_RATE };
}

export function PerfSampling_decide(): IPerfSamplingDecision {
  return PerfSampling_decideFor(Math.random());
}
