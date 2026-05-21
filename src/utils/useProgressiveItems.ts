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
  debugLabel?: string;
}

export function useProgressiveCount(total: number, options?: IProgressiveOptions): number {
  const initialBatch = options?.initialBatch ?? 4;
  const batchSize = options?.batchSize ?? 4;
  const threshold = options?.threshold ?? 600;
  const rateLimitMs = options?.rateLimitMs ?? 200;
  const debugLabel = options?.debugLabel;

  const [count, setCount] = useState(() => Math.min(initialBatch, total));
  const countRef = useRef(count);
  countRef.current = count;
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
        const next = Math.min(countRef.current + batchSize, total);
        countRef.current = next;
        dbg(debugLabel, `scroll bump → ${next}/${total}`);
        setCount(next);
      }
    });
  }, [ctx, total, batchSize, threshold, rateLimitMs, debugLabel]);

  useEffect(() => {
    if (count >= total) {
      if (count > 0 && count === total) {
        dbg(debugLabel, `complete: all ${total} items revealed`);
      }
      return undefined;
    }
    const g = globalThis as unknown as IIdleGlobal;
    const tick = (): void => {
      const next = Math.min(countRef.current + batchSize, total);
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
  }, [count, total, batchSize, debugLabel]);

  return Math.min(count, total);
}

export function useProgressiveItems<T>(items: T[], options?: IProgressiveOptions): T[] {
  const count = useProgressiveCount(items.length, options);
  return count >= items.length ? items : items.slice(0, count);
}
