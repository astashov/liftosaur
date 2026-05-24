import { Platform } from "react-native";
import { PerfTrackerStore_create, PerfTrackerStore_generateSessionId } from "./perfTrackerStore";
import type { IPerfEvent } from "./perfTracker";

export type { IPerfEvent };

declare let __API_HOST__: string;
declare let __DEV__: boolean;

const BATCH_INTERVAL_MS = 1500;
const BATCH_MAX_SIZE = 50;
const RING_BUFFER_SIZE = 200;
const REQUEST_TIMEOUT_MS = 3_000;

const sessionId = PerfTrackerStore_generateSessionId();
const store = PerfTrackerStore_create({ ringBufferSize: RING_BUFFER_SIZE, batchMaxSize: BATCH_MAX_SIZE });
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionStartSent = false;

function scheduleFlush(): void {
  if (flushTimer != null) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushNow().catch(() => undefined);
  }, BATCH_INTERVAL_MS);
}

async function flushNow(): Promise<void> {
  const batch = store.drainPending();
  if (batch.length === 0) {
    return;
  }
  const body = batch.map((e) => JSON.stringify(e)).join("\n") + "\n";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    await fetch(`${__API_HOST__}/api/_dev/perf`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body,
      signal: controller.signal,
    });
  } catch {
    // Fire-and-forget: drop on any failure so perf measurement is unaffected.
  } finally {
    clearTimeout(timeoutId);
  }
}

function ensureSessionStart(): void {
  if (sessionStartSent) {
    return;
  }
  sessionStartSent = true;
  PerfTracker_recordEvent({
    type: "session_start",
    session: sessionId,
    ts: Date.now(),
    platform: Platform.OS,
    build: "dev",
  });
}

export function PerfTracker_mark(_name: string, _screen?: string): void {
  // Reserved for future low-level marks. Today, navigation/render events are
  // constructed and submitted whole via PerfTracker_recordEvent.
}

export function PerfTracker_recordEvent(event: IPerfEvent): void {
  if (!__DEV__) {
    return;
  }
  ensureSessionStart();
  const result = store.recordEvent(event);
  if (result === "flush") {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushNow().catch(() => undefined);
  } else {
    scheduleFlush();
  }
}

export function PerfTracker_getSessionId(): string {
  return sessionId;
}

export function PerfTracker_flush(): Promise<void> {
  if (!__DEV__) {
    return Promise.resolve();
  }
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return flushNow();
}

export function PerfTracker_getRecent(n: number): IPerfEvent[] {
  return store.getRecent(n);
}
