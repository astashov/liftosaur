import { RefObject, useEffect, useRef, useState } from "react";

export function useProgressiveList<T>(collection: T[], batchSize: number = 30): {
  visibleItems: T[];
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
} {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [collection, batchSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + batchSize, collection.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [collection.length, batchSize]);

  return {
    visibleItems: collection.slice(0, visibleCount),
    sentinelRef,
    hasMore: visibleCount < collection.length,
  };
}
