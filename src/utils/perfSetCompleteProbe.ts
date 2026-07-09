import { lg } from "./posthog";

// TEMP DIAGNOSTIC (remove after investigation): attributes the per-tap workout-screen commit cost
// for two specific users who reported multi-second lag on set completion. Everything here is a no-op
// unless the running device's tempUserId is in this list, so it's safe to ship in a normal bundle.
const TARGET_USER_IDS = ["wtudhpsaxn", "xfuonfcjme"];

// A tap fires a burst of commits (the completion itself + the sync loading lifecycle). We only record
// commits while a tap window is open (opened by PerfProbe_onAction) so mount/nav/timer commits that
// no tap caused don't create noise, then flush once the burst goes quiet.
const FLUSH_QUIET_MS = 400;
// A window with no commits (a tap that caused no render) still flushes so it can't latch onto a later,
// unrelated commit.
const WINDOW_MAX_MS = 2500;

type IProfilerPhase = "mount" | "update" | "nested-update";

interface ISubtreeAgg {
  commits: number;
  sumMs: number;
  maxMs: number;
  mounts: number;
  updates: number;
}

let byId: Record<string, ISubtreeAgg> = {};
let triggerLabel: string | undefined;
let triggerReducerMs = 0;
let windowActive = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function PerfProbe_isTarget(): boolean {
  const uid =
    (typeof globalThis !== "undefined" ? (globalThis as { tempUserId?: string }).tempUserId : undefined) ??
    (typeof window !== "undefined" ? window.tempUserId : undefined);
  return uid != null && TARGET_USER_IDS.indexOf(uid) >= 0;
}

// Opens a tap window for user-initiated actions only (not the sync/loading UpdateStates), so the burst
// is labeled by the tap that started it and pre-tap commits are excluded.
export function PerfProbe_onAction(label: string, reducerMs: number): void {
  if (!PerfProbe_isTarget()) {
    return;
  }
  if (windowActive) {
    // Two taps before the previous window drained — flush the old one under its own label first.
    flush();
  }
  triggerLabel = label;
  triggerReducerMs = reducerMs;
  windowActive = true;
  scheduleFlush(WINDOW_MAX_MS);
}

export function PerfProbe_onCommit(id: string, phase: IProfilerPhase, durationMs: number): void {
  if (!PerfProbe_isTarget() || !windowActive) {
    return;
  }
  const agg = byId[id] ?? (byId[id] = { commits: 0, sumMs: 0, maxMs: 0, mounts: 0, updates: 0 });
  agg.commits += 1;
  agg.sumMs += durationMs;
  agg.maxMs = Math.max(agg.maxMs, durationMs);
  if (phase === "mount") {
    agg.mounts += 1;
  } else {
    agg.updates += 1;
  }
  scheduleFlush(FLUSH_QUIET_MS);
}

function scheduleFlush(ms: number): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(flush, ms);
}

function flush(): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
  }
  flushTimer = undefined;
  windowActive = false;
  const ids = Object.keys(byId);
  if (ids.length === 0) {
    triggerLabel = undefined;
    triggerReducerMs = 0;
    return;
  }
  const extra: Record<string, string | number> = {
    trigger: triggerLabel ?? "unknown",
    reducer_ms: Math.round(triggerReducerMs),
  };
  for (const id of ids) {
    const a = byId[id];
    extra[`${id}_commits`] = a.commits;
    extra[`${id}_sum_ms`] = Math.round(a.sumMs);
    extra[`${id}_max_ms`] = Math.round(a.maxMs);
    extra[`${id}_mounts`] = a.mounts;
    extra[`${id}_updates`] = a.updates;
  }
  byId = {};
  triggerLabel = undefined;
  triggerReducerMs = 0;
  lg("perf-set-complete", extra);
}
