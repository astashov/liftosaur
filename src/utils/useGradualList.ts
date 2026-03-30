import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export function useGradualList<T>(
  collection: T[],
  initialShift: number,
  pageLength: number,
  containerRef: RefObject<HTMLElement | null>,
  callback: (visibleRecords: number, nextVisibleRecords: number) => void
): { visibleRecords: number; loadMoreVisibleRecords: (cnt: number) => void } {
  const [visibleRecords, setVisibleRecords] = useState<number>(initialShift + pageLength);
  const visibleRecordsRef = useRef<number>(visibleRecords);

  useEffect(() => {
    function scrollHandler(): void {
      if (window.pageYOffset + window.innerHeight > (containerRef.current?.clientHeight ?? 0) - 500) {
        const vr = Math.min(visibleRecordsRef.current + 20, collection.length);
        if (visibleRecordsRef.current !== vr) {
          callback(visibleRecordsRef.current, vr);
          setVisibleRecords(vr);
          visibleRecordsRef.current = vr;
        }
      }
    }
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, [collection.length]);

  const loadMoreVisibleRecords = useCallback((cnt: number) => {
    setVisibleRecords(visibleRecordsRef.current + cnt);
    visibleRecordsRef.current = visibleRecordsRef.current + cnt;
  }, []);

  return { visibleRecords: visibleRecordsRef.current, loadMoreVisibleRecords };
}
