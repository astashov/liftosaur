import { RefObject, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { NavScreenScrollContext } from "../navigation/NavScreenContent";

export function useGradualList<T>(
  collection: T[],
  initialShift: number,
  pageLength: number,
  containerRef: RefObject<{ clientHeight?: number } | null>,
  callback: (visibleRecords: number, nextVisibleRecords: number) => void,
  scrollContainerRef?: RefObject<HTMLElement | null>
): { visibleRecords: number; loadMoreVisibleRecords: (cnt: number) => void } {
  const [visibleRecords, setVisibleRecords] = useState<number>(initialShift + pageLength);
  const visibleRecordsRef = useRef<number>(visibleRecords);
  const navScrollCtx = useContext(NavScreenScrollContext);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const navScrollNode = navScrollCtx?.scrollRef.current as
      | (HTMLElement & { getScrollableNode?: () => HTMLElement })
      | null
      | undefined;
    const fallbackEl = navScrollNode?.getScrollableNode ? navScrollNode.getScrollableNode() : (navScrollNode ?? null);
    const scrollEl = scrollContainerRef?.current ?? fallbackEl;
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
