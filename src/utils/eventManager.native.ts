import { AppState, AppStateStatus } from "react-native";
import { createMMKV } from "react-native-mmkv";
import NativeLiftosaurEventReporter from "../specs/NativeLiftosaurEventReporter";

type IStoredEvent = { id: string; data: string; timestamp: number };

declare let __API_HOST__: string;

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 30_000;
const RETRY_DELAY_MS = 5_000;
const MAX_FAILED = 1000;
const MAX_EVENT_SIZE = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;

const KEY_PENDING = "pendingEvents";
const KEY_PROCESSING = "processingEvents";
const KEY_FAILED = "failedEvents";

const mmkv = createMMKV({ id: "liftosaur.events" });

let pending: IStoredEvent[] = [];
let processing: IStoredEvent[] = [];
let isProcessing = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let telemetryInitialized = false;

function loadList(key: string): IStoredEvent[] {
  const raw = mmkv.getString(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((e): e is IStoredEvent => {
      return (
        e != null &&
        typeof e === "object" &&
        typeof (e as IStoredEvent).id === "string" &&
        typeof (e as IStoredEvent).data === "string" &&
        typeof (e as IStoredEvent).timestamp === "number"
      );
    });
  } catch {
    return [];
  }
}

function saveList(key: string, list: IStoredEvent[]): void {
  if (list.length === 0) {
    mmkv.remove(key);
    return;
  }
  try {
    mmkv.set(key, JSON.stringify(list));
  } catch (e) {
    console.warn(`EventManager: failed to persist ${key}`, e);
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function recoverFromCrash(): void {
  const stale = loadList(KEY_PROCESSING);
  if (stale.length === 0) {
    return;
  }
  const failed = loadList(KEY_FAILED);
  const failedIds = new Set(failed.map((e) => e.id));
  for (const ev of stale) {
    if (!failedIds.has(ev.id)) {
      failed.push(ev);
    }
  }
  const capped = failed.length > MAX_FAILED ? failed.slice(failed.length - MAX_FAILED) : failed;
  saveList(KEY_FAILED, capped);
  mmkv.remove(KEY_PROCESSING);
}

function handleFailedEvents(events: IStoredEvent[]): void {
  const failed = loadList(KEY_FAILED);
  const failedIds = new Set(failed.map((e) => e.id));
  for (const ev of events) {
    if (!failedIds.has(ev.id)) {
      failed.push(ev);
    }
  }
  const capped = failed.length > MAX_FAILED ? failed.slice(failed.length - MAX_FAILED) : failed;
  saveList(KEY_FAILED, capped);
}

async function postBatch(events: IStoredEvent[]): Promise<{ success: boolean; acknowledged?: string[] }> {
  if (events.length === 0) {
    return { success: true, acknowledged: [] };
  }
  const host = typeof __API_HOST__ !== "undefined" ? __API_HOST__ : undefined;
  if (!host) {
    return { success: false };
  }
  const url = `${host}/api/batchevents`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: events.map((e) => ({ id: e.id, data: e.data })),
      }),
      credentials: "include",
      signal: controller.signal,
    });
    if (!resp.ok) {
      return { success: false };
    }
    let json: { acknowledged?: string[] } = {};
    try {
      json = (await resp.json()) as { acknowledged?: string[] };
    } catch {
      // empty body or non-JSON — treat as all acknowledged
    }
    const acknowledged = Array.isArray(json.acknowledged) ? json.acknowledged : events.map((e) => e.id);
    return { success: true, acknowledged };
  } catch {
    return { success: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function flushInternal(): Promise<void> {
  if (isProcessing) {
    return;
  }
  if (pending.length === 0) {
    return;
  }

  isProcessing = true;
  const batch = pending;
  pending = [];
  processing = processing.concat(batch);
  saveList(KEY_PROCESSING, processing);
  mmkv.remove(KEY_PENDING);

  const result = await postBatch(batch);

  try {
    if (result.success && result.acknowledged) {
      const ackSet = new Set(result.acknowledged);
      processing = processing.filter((e) => !ackSet.has(e.id));
      const unacknowledged = batch.filter((e) => !ackSet.has(e.id));
      if (unacknowledged.length > 0) {
        handleFailedEvents(unacknowledged);
      }
    } else {
      handleFailedEvents(batch);
    }
    const batchIds = new Set(batch.map((e) => e.id));
    processing = processing.filter((e) => !batchIds.has(e.id));
    saveList(KEY_PROCESSING, processing);
  } finally {
    isProcessing = false;
  }
}

async function processFailedOnce(): Promise<void> {
  const failed = loadList(KEY_FAILED);
  if (failed.length === 0) {
    return;
  }

  processing = processing.concat(failed);
  saveList(KEY_PROCESSING, processing);

  const result = await postBatch(failed);
  try {
    if (result.success && result.acknowledged) {
      const ackSet = new Set(result.acknowledged);
      const remainingFailed = loadList(KEY_FAILED).filter((e) => !ackSet.has(e.id));
      saveList(KEY_FAILED, remainingFailed);
      const unacknowledged = failed.filter((e) => !ackSet.has(e.id));
      if (unacknowledged.length > 0) {
        handleFailedEvents(unacknowledged);
      }
      processing = processing.filter((e) => !ackSet.has(e.id));
    } else {
      handleFailedEvents(failed);
    }
    const failedIds = new Set(failed.map((e) => e.id));
    processing = processing.filter((e) => !failedIds.has(e.id));
    saveList(KEY_PROCESSING, processing);
  } catch (e) {
    console.warn("EventManager: processFailed error", e);
  }
}

function startTimer(): void {
  if (flushTimer != null) {
    return;
  }
  flushTimer = setInterval(() => {
    flushInternal().catch((e) => console.warn("EventManager: flush error", e));
  }, FLUSH_INTERVAL_MS);
}

function stopTimer(): void {
  if (flushTimer != null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

function handleAppStateChange(next: AppStateStatus): void {
  if (next === "background" || next === "inactive") {
    stopTimer();
    flushInternal().catch(() => undefined);
  } else if (next === "active") {
    startTimer();
  }
}

function initIfNeeded(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  recoverFromCrash();
  pending = loadList(KEY_PENDING);
  AppState.addEventListener("change", handleAppStateChange);
  startTimer();
  setTimeout(() => {
    processFailedOnce().catch((e) => console.warn("EventManager: processFailedOnce error", e));
  }, RETRY_DELAY_MS);
}

initIfNeeded();

export function EventManager_isAvailable(): boolean {
  return true;
}

export function EventManager_log(data: string): void {
  if (!data || data.length === 0 || data.length >= MAX_EVENT_SIZE) {
    return;
  }
  if (pending.length >= MAX_FAILED) {
    console.warn("EventManager: dropping event, too many pending");
    return;
  }
  pending.push({ id: makeId(), data, timestamp: Date.now() });
  saveList(KEY_PENDING, pending);
  if (pending.length >= BATCH_SIZE) {
    flushInternal().catch((e) => console.warn("EventManager: flush error", e));
  }
}

export function EventManager_flush(): Promise<void> {
  return flushInternal();
}

export type IEventManagerTelemetryHandler = (event: {
  name: string;
  timestamp: number;
  extra: Record<string, string>;
}) => void;

export function EventManager_initTelemetry(handler: IEventManagerTelemetryHandler): void {
  if (telemetryInitialized) {
    return;
  }
  telemetryInitialized = true;

  NativeLiftosaurEventReporter.onTelemetryEvent((event) => {
    try {
      handler({ name: event.name, timestamp: event.timestamp, extra: event.extra ?? {} });
    } catch (e) {
      console.warn("EventManager: telemetry handler error", e);
    }
  });

  NativeLiftosaurEventReporter.getLastTerminationInfo()
    .then((info) => {
      if (info != null) {
        handler({ name: "rn-app-restart", timestamp: info.timestamp, extra: { ...info.extra, reason: info.reason } });
      }
    })
    .catch((e) => console.warn("EventManager: getLastTerminationInfo failed", e));

  NativeLiftosaurEventReporter.flushPendingTelemetry().catch((e) =>
    console.warn("EventManager: flushPendingTelemetry failed", e)
  );
}
