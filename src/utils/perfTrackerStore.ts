import type { IPerfEvent } from "./perfTracker";

export interface IPerfTrackerStoreOptions {
  ringBufferSize: number;
  batchMaxSize: number;
}

export interface IPerfTrackerStore {
  recordEvent: (event: IPerfEvent) => "buffered" | "flush";
  drainPending: () => IPerfEvent[];
  getRecent: (n: number) => IPerfEvent[];
  pendingCount: () => number;
}

export function PerfTrackerStore_create(options: IPerfTrackerStoreOptions): IPerfTrackerStore {
  const pending: IPerfEvent[] = [];
  const ring: IPerfEvent[] = [];

  return {
    recordEvent: (event) => {
      ring.push(event);
      if (ring.length > options.ringBufferSize) {
        ring.shift();
      }
      pending.push(event);
      return pending.length >= options.batchMaxSize ? "flush" : "buffered";
    },
    drainPending: () => {
      const drained = pending.slice();
      pending.length = 0;
      return drained;
    },
    getRecent: (n) => {
      if (n >= ring.length) {
        return ring.slice();
      }
      return ring.slice(ring.length - n);
    },
    pendingCount: () => pending.length,
  };
}

export function PerfTrackerStore_generateSessionId(
  now: () => number = Date.now,
  rand: () => number = Math.random
): string {
  const ts = new Date(now()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const r = Math.floor(rand() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `${ts}-${r}`;
}
