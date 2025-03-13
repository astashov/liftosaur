import { RefObject } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";

export function useGradualList<T>(
  collection: T[],
  pageLength: number,
  containerRef: RefObject<HTMLElement>,
  callback: (visibleRecords: number, nextVisibleRecords: number) => void
): number {
  const [visibleRecords, setVisibleRecords] = useState<number>(pageLength);
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

  return visibleRecordsRef.current;
}
