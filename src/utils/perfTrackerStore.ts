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
  const ringSize = options.ringBufferSize;
  const ring: (IPerfEvent | undefined)[] = new Array(ringSize);
  let ringWrite = 0;
  let ringCount = 0;

  return {
    recordEvent: (event) => {
      ring[ringWrite % ringSize] = event;
      ringWrite += 1;
      if (ringCount < ringSize) {
        ringCount += 1;
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
      const count = Math.min(n, ringCount);
      const start = ringWrite - count;
      const result: IPerfEvent[] = [];
      for (let i = 0; i < count; i += 1) {
        const event = ring[(start + i) % ringSize];
        if (event !== undefined) {
          result.push(event);
        }
      }
      return result;
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
