import { useRef, useState, useEffect, Ref } from "react";

export function useGradualList<T>(
  collection: T[],
  pageLength: number,
  callback: (visibleRecords: number, nextVisibleRecords: number) => void
): [Ref<HTMLElement>, number] {
  const [visibleRecords, setVisibleRecords] = useState<number>(pageLength);
  const visibleRecordsRef = useRef<number>(visibleRecords);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function scrollHandler(): void {
      if (window.pageYOffset + window.innerHeight > containerRef.current!.clientHeight - 500) {
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

  return [containerRef, visibleRecordsRef.current];
}
