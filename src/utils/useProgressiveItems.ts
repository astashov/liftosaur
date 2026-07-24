import { useContext, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";

interface IIdleGlobal {
  requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const DEBUG = process.env.NODE_ENV !== "production";

function dbg(label: string | undefined, message: string): void {
  if (DEBUG) {
    console.log(`[progressive${label ? ` ${label}` : ""}] ${message}`);
  }
}

interface IProgressiveOptions {
  initialBatch?: number;
  batchSize?: number;
  threshold?: number;
  rateLimitMs?: number;
  // When set, idle-time revealing stops at this count. The rest is only revealed
  // once the user scrolls near the bottom (avoids rendering long tails nobody looks at).
  idleCap?: number;
  debugLabel?: string;
  resetKey?: unknown;
}

export function useProgressiveCount(total: number, options?: IProgressiveOptions): number {
  const initialBatch = options?.initialBatch ?? 4;
  const batchSize = options?.batchSize ?? 4;
  const threshold = options?.threshold ?? 600;
  const rateLimitMs = options?.rateLimitMs ?? 200;
  const idleCap = options?.idleCap;
  const debugLabel = options?.debugLabel;
  const resetKey = options?.resetKey;

  const [count, setCount] = useState(() => Math.min(initialBatch, total));
  const [prevResetKey, setPrevResetKey] = useState<unknown>(resetKey);
  const unlockedRef = useRef(false);
  let effectiveCount = count;
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    unlockedRef.current = false;
    effectiveCount = Math.min(initialBatch, total);
    setCount(effectiveCount);
    dbg(debugLabel, `reset → ${effectiveCount}/${total} (resetKey changed)`);
  }
  const countRef = useRef(effectiveCount);
  countRef.current = effectiveCount;
  const lastBumpRef = useRef(0);

  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    dbg(
      debugLabel,
      `mounted with ${count}/${total} items visible (initialBatch=${initialBatch}, batchSize=${batchSize})`
    );
  }

  const ctx = useContext(NavScreenScrollContext);

  useEffect(() => {
    if (!ctx) {
      return undefined;
    }
    return ctx.addScrollListener((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (countRef.current >= total) {
        return;
      }
      const now = Date.now();
      if (now - lastBumpRef.current < rateLimitMs) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentOffset.y + layoutMeasurement.height > contentSize.height - threshold) {
        lastBumpRef.current = now;
        unlockedRef.current = true;
        const next = Math.min(countRef.current + batchSize, total);
        countRef.current = next;
        dbg(debugLabel, `scroll bump → ${next}/${total}`);
        setCount(next);
      }
    });
  }, [ctx, total, batchSize, threshold, rateLimitMs, debugLabel]);

  useEffect(() => {
    const idleTarget = idleCap == null || unlockedRef.current ? total : Math.min(idleCap, total);
    if (count >= idleTarget) {
      if (count > 0 && count === total) {
        dbg(debugLabel, `complete: all ${total} items revealed`);
      } else if (count === idleTarget) {
        dbg(debugLabel, `idle cap reached at ${count}/${total}, waiting for scroll`);
      }
      return undefined;
    }
    const g = globalThis as unknown as IIdleGlobal;
    const tick = (): void => {
      const cap = idleCap == null || unlockedRef.current ? total : Math.min(idleCap, total);
      const next = Math.min(countRef.current + batchSize, cap);
      countRef.current = next;
      dbg(debugLabel, `idle bump → ${next}/${total}`);
      setCount(next);
    };
    if (g.requestIdleCallback) {
      const handle = g.requestIdleCallback(tick, { timeout: 300 });
      return () => g.cancelIdleCallback?.(handle);
    }
    const handle = setTimeout(tick, 50) as unknown as number;
    return () => clearTimeout(handle);
  }, [count, total, batchSize, idleCap, debugLabel]);

  return Math.min(effectiveCount, total);
}

export function useProgressiveItems<T>(items: T[], options?: IProgressiveOptions): T[] {
  const count = useProgressiveCount(items.length, options);
  return count >= items.length ? items : items.slice(0, count);
}
