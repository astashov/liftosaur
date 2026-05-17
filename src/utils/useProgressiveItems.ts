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

export function useProgressiveItems<T>(
  items: T[],
  options?: {
    initialBatch?: number;
    batchSize?: number;
    threshold?: number;
    rateLimitMs?: number;
    debugLabel?: string;
  }
): T[] {
  const initialBatch = options?.initialBatch ?? 4;
  const batchSize = options?.batchSize ?? 4;
  const threshold = options?.threshold ?? 600;
  const rateLimitMs = options?.rateLimitMs ?? 200;
  const debugLabel = options?.debugLabel;

  const [count, setCount] = useState(() => Math.min(initialBatch, items.length));
  const countRef = useRef(count);
  countRef.current = count;
  const lastBumpRef = useRef(0);

  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    dbg(
      debugLabel,
      `mounted with ${count}/${items.length} items visible (initialBatch=${initialBatch}, batchSize=${batchSize})`
    );
  }

  const ctx = useContext(NavScreenScrollContext);

  useEffect(() => {
    if (!ctx) {
      return undefined;
    }
    return ctx.addScrollListener((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (countRef.current >= items.length) {
        return;
      }
      const now = Date.now();
      if (now - lastBumpRef.current < rateLimitMs) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentOffset.y + layoutMeasurement.height > contentSize.height - threshold) {
        lastBumpRef.current = now;
        const next = Math.min(countRef.current + batchSize, items.length);
        countRef.current = next;
        dbg(debugLabel, `scroll bump → ${next}/${items.length}`);
        setCount(next);
      }
    });
  }, [ctx, items.length, batchSize, threshold, rateLimitMs, debugLabel]);

  useEffect(() => {
    if (count >= items.length) {
      if (count > 0 && count === items.length) {
        dbg(debugLabel, `complete: all ${items.length} items revealed`);
      }
      return undefined;
    }
    const g = globalThis as unknown as IIdleGlobal;
    const tick = (): void => {
      const next = Math.min(countRef.current + batchSize, items.length);
      countRef.current = next;
      dbg(debugLabel, `idle bump → ${next}/${items.length}`);
      setCount(next);
    };
    if (g.requestIdleCallback) {
      const handle = g.requestIdleCallback(tick, { timeout: 300 });
      return () => g.cancelIdleCallback?.(handle);
    }
    const handle = setTimeout(tick, 50) as unknown as number;
    return () => clearTimeout(handle);
  }, [count, items.length, batchSize, debugLabel]);

  return count >= items.length ? items : items.slice(0, count);
}
