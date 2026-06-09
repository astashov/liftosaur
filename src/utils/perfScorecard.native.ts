import { lg } from "./posthog";
import { PerfEnabled_tier1 } from "./perfEnabled";
import type { IPerfFrameWindow, IPerfRecentAction } from "./perfTracker";

interface IScreenAggregate {
  screen: string;
  startTs: number;
  framesTotal: number;
  framesSlow: number;
  framesFrozen: number;
  maxGapMs: number;
  longtaskCount: number;
  maxLongtaskMs: number;
  worstLongtaskActions?: IPerfRecentAction[];
  worstActionLabel?: string;
  worstActionMs: number;
}

let current: IScreenAggregate | undefined;
let contextProvider: (() => Record<string, number>) | undefined;

// App supplies the dimensions we can't reproduce locally (history size, program count, ...) — read
// lazily at flush time so we never hold a stale snapshot.
export function PerfScorecard_setContextProvider(provider: () => Record<string, number>): void {
  contextProvider = provider;
}

function startAggregate(screen: string, ts: number): IScreenAggregate {
  return {
    screen,
    startTs: ts,
    framesTotal: 0,
    framesSlow: 0,
    framesFrozen: 0,
    maxGapMs: 0,
    longtaskCount: 0,
    maxLongtaskMs: 0,
    worstActionMs: 0,
  };
}

function ensureCurrent(screen: string | undefined, ts: number): IScreenAggregate | undefined {
  if (current == null && screen != null) {
    current = startAggregate(screen, ts);
  }
  return current;
}

export function PerfScorecard_recordFrameWindow(window: IPerfFrameWindow): void {
  if (!PerfEnabled_tier1()) {
    return;
  }
  const agg = ensureCurrent(window.screen, window.ts);
  if (agg == null) {
    return;
  }
  agg.framesTotal += window.frames_total;
  agg.framesSlow += window.frames_slow;
  agg.framesFrozen += window.frames_frozen;
  if (window.max_gap_ms > agg.maxGapMs) {
    agg.maxGapMs = window.max_gap_ms;
  }
}

export function PerfScorecard_recordLongTask(
  durationMs: number,
  screen: string | undefined,
  recent?: IPerfRecentAction[]
): void {
  if (!PerfEnabled_tier1()) {
    return;
  }
  const agg = ensureCurrent(screen, Date.now());
  if (agg == null) {
    return;
  }
  agg.longtaskCount += 1;
  if (durationMs > agg.maxLongtaskMs) {
    agg.maxLongtaskMs = durationMs;
    agg.worstLongtaskActions = recent;
  }
}

// Called from the reducer funnel for every dispatch — keeps the slowest synchronous action so the
// scorecard can name it directly (no correlation needed for the in-reducer case).
export function PerfScorecard_recordAction(label: string, durationMs: number): void {
  if (!PerfEnabled_tier1()) {
    return;
  }
  const agg = current;
  if (agg == null) {
    return;
  }
  if (durationMs > agg.worstActionMs) {
    agg.worstActionMs = durationMs;
    agg.worstActionLabel = label;
  }
}

function pct(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export function PerfScorecard_flush(): void {
  const agg = current;
  current = undefined;
  if (agg == null || !PerfEnabled_tier1()) {
    return;
  }
  // Nothing worth reporting (e.g. a screen the user instantly bounced off).
  if (agg.framesTotal === 0 && agg.longtaskCount === 0 && agg.worstActionMs === 0) {
    return;
  }
  const extra: Record<string, string | number> = {
    screen: agg.screen,
    duration_ms: Math.max(0, Date.now() - agg.startTs),
    frames_total: agg.framesTotal,
    slow_frame_pct: pct(agg.framesSlow, agg.framesTotal),
    frozen_frame_pct: pct(agg.framesFrozen, agg.framesTotal),
    max_gap_ms: agg.maxGapMs,
    longtask_count: agg.longtaskCount,
    max_longtask_ms: Math.round(agg.maxLongtaskMs),
    worst_action_ms: Math.round(agg.worstActionMs),
    ...(contextProvider?.() ?? {}),
  };
  if (agg.worstActionLabel != null) {
    extra.worst_action_label = agg.worstActionLabel;
  }
  if (agg.worstLongtaskActions != null && agg.worstLongtaskActions.length > 0) {
    extra.worst_longtask_actions = JSON.stringify(agg.worstLongtaskActions);
  }
  lg("perf_screen", extra);
}

export function PerfScorecard_onScreenChange(screen: string | undefined): void {
  if (!PerfEnabled_tier1()) {
    return;
  }
  PerfScorecard_flush();
  if (screen != null) {
    current = startAggregate(screen, Date.now());
  }
}
