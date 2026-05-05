import { useCallback, useEffect, useRef, useState } from "react";

export interface IScrollEventLike {
  nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  };
}

export function useScrollProgressiveList<T>(
  collection: T[],
  options?: { batchSize?: number; threshold?: number; rateLimitMs?: number; enabled?: boolean }
): {
  visibleRecords: number;
  visibleItems: T[];
  onScroll: (e: IScrollEventLike) => void;
  hasMore: boolean;
} {
  const batchSize = options?.batchSize ?? 20;
  const threshold = options?.threshold ?? 500;
  const rateLimitMs = options?.rateLimitMs ?? 300;
  const enabled = options?.enabled ?? true;

  const initial = enabled ? batchSize : collection.length;
  const [visibleRecords, setVisibleRecords] = useState<number>(initial);
  const visibleRef = useRef<number>(initial);
  const lastBumpRef = useRef<number>(0);

  useEffect(() => {
    const next = enabled ? batchSize : collection.length;
    visibleRef.current = next;
    lastBumpRef.current = 0;
    setVisibleRecords(next);
  }, [collection, batchSize, enabled]);

  const onScroll = useCallback(
    (e: IScrollEventLike) => {
      if (visibleRef.current >= collection.length) {
        return;
      }
      const now = Date.now();
      if (now - lastBumpRef.current < rateLimitMs) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentOffset.y + layoutMeasurement.height > contentSize.height - threshold) {
        lastBumpRef.current = now;
        const next = Math.min(visibleRef.current + batchSize, collection.length);
        visibleRef.current = next;
        setVisibleRecords(next);
      }
    },
    [collection.length, batchSize, threshold, rateLimitMs]
  );

  return {
    visibleRecords,
    visibleItems: collection.slice(0, visibleRecords),
    onScroll,
    hasMore: visibleRecords < collection.length,
  };
}
