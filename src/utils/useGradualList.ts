import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export function useGradualList<T>(
  collection: T[],
  initialShift: number,
  pageLength: number,
  containerRef: RefObject<HTMLElement | null>,
  callback: (visibleRecords: number, nextVisibleRecords: number) => void,
  scrollContainerRef?: RefObject<HTMLElement | null>
): { visibleRecords: number; loadMoreVisibleRecords: (cnt: number) => void } {
  const [visibleRecords, setVisibleRecords] = useState<number>(initialShift + pageLength);
  const visibleRecordsRef = useRef<number>(visibleRecords);

  useEffect(() => {
    const scrollEl = scrollContainerRef?.current;
    function scrollHandler(): void {
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.pageYOffset;
      const viewportHeight = scrollEl ? scrollEl.clientHeight : window.innerHeight;
      if (scrollTop + viewportHeight > (containerRef.current?.clientHeight ?? 0) - 500) {
        const vr = Math.min(visibleRecordsRef.current + 20, collection.length);
        if (visibleRecordsRef.current !== vr) {
          callback(visibleRecordsRef.current, vr);
          setVisibleRecords(vr);
          visibleRecordsRef.current = vr;
        }
      }
    }
    const target = scrollEl || window;
    target.addEventListener("scroll", scrollHandler);
    return () => target.removeEventListener("scroll", scrollHandler);
  }, [collection.length]);

  const loadMoreVisibleRecords = useCallback((cnt: number) => {
    setVisibleRecords(visibleRecordsRef.current + cnt);
    visibleRecordsRef.current = visibleRecordsRef.current + cnt;
  }, []);

  return { visibleRecords: visibleRecordsRef.current, loadMoreVisibleRecords };
}
