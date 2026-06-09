import { useRef, useMemo } from "react";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "./perfTracker";
import { PerfEnabled_tier2 } from "./perfEnabled";
import { getCurrentScreenData } from "../navigation/navigationService";

export interface IPerfScrollMarkers {
  onScrollBeginDrag: () => void;
  onMomentumScrollEnd: () => void;
  onScrollEndDrag: () => void;
}

export function usePerfScrollMarkers(label?: string): IPerfScrollMarkers {
  const isScrollingRef = useRef(false);
  const momentumPendingRef = useRef(false);

  return useMemo(() => {
    function emit(type: "scroll_start" | "scroll_end"): void {
      if (!PerfEnabled_tier2()) {
        return;
      }
      PerfTracker_recordEvent({
        type,
        session: PerfTracker_getSessionId(),
        screen: getCurrentScreenData()?.name,
        label,
        ts: Date.now(),
      });
    }

    return {
      onScrollBeginDrag: () => {
        if (isScrollingRef.current) {
          return;
        }
        isScrollingRef.current = true;
        momentumPendingRef.current = false;
        emit("scroll_start");
      },
      onScrollEndDrag: () => {
        momentumPendingRef.current = true;
        setTimeout(() => {
          if (!momentumPendingRef.current) {
            return;
          }
          momentumPendingRef.current = false;
          if (!isScrollingRef.current) {
            return;
          }
          isScrollingRef.current = false;
          emit("scroll_end");
        }, 32);
      },
      onMomentumScrollEnd: () => {
        momentumPendingRef.current = false;
        if (!isScrollingRef.current) {
          return;
        }
        isScrollingRef.current = false;
        emit("scroll_end");
      },
    };
  }, [label]);
}
