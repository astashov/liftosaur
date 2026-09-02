import { MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { View } from "react-native";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";
import { ClickTrackingContext } from "./clickTracking";
import { Thunk_postevent } from "../ducks/thunks";
import { WorkoutImpressionVisibility_isSeen } from "./workoutImpressionVisibility";

const RATE_LIMIT_MS = 200;

interface IWorkoutImpressionArgs {
  name: string;
  // Neighbouring pages stay mounted off to the side, and the scroll context reports no horizontal
  // offset to rule them out with.
  isCurrentPage: boolean;
  // Must outlive the card: cards unmount as you swipe away, and a latch inside one would re-arm.
  seenRef: MutableRefObject<Set<string>>;
}

export function useWorkoutImpression(args: IWorkoutImpressionArgs): {
  ref: (node: View | null) => void;
  onLayout: () => void;
} {
  const { name, isCurrentPage, seenRef } = args;
  const scrollCtx = useContext(NavScreenScrollContext);
  const dispatch = useContext(ClickTrackingContext);
  const nodeRef = useRef<View | null>(null);
  const lastCheckRef = useRef(0);

  const isCurrentPageRef = useRef(isCurrentPage);
  isCurrentPageRef.current = isCurrentPage;

  const check = useCallback(
    (force: boolean) => {
      if (!isCurrentPageRef.current || dispatch == null || seenRef.current.has(name)) {
        return;
      }
      const viewport = scrollCtx?.viewportRef.current;
      const node = nodeRef.current;
      if (viewport == null || node == null) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastCheckRef.current < RATE_LIMIT_MS) {
        return;
      }
      lastCheckRef.current = now;
      const stickyHeaderHeight = scrollCtx?.stickyHeaderHeight ?? 0;
      // Subtracted rather than compared to window height: on Android edge-to-edge the window and
      // measureInWindow don't share an origin.
      viewport.measureInWindow((_vx, vy, _vw, vh) => {
        node.measureInWindow((_x, y, _w, h) => {
          // Two async round-trips are long enough to swipe away or unmount.
          if (!isCurrentPageRef.current || nodeRef.current !== node) {
            return;
          }
          if (h <= 0 || vh <= 0 || seenRef.current.has(name)) {
            return;
          }
          const isSeen = WorkoutImpressionVisibility_isSeen({
            top: y - vy,
            height: h,
            viewportHeight: vh,
            stickyHeaderHeight,
          });
          if (isSeen) {
            seenRef.current.add(name);
            dispatch(Thunk_postevent(`view-nm-${name}`));
          }
        });
      });
    },
    [scrollCtx, dispatch, name, seenRef]
  );

  // Three triggers, none sufficient alone: a swipe fires no scroll event, and the measured blocks
  // mount 350ms late, after this listener registered and after addScrollListener replayed.
  useEffect(() => {
    return scrollCtx?.addScrollListener(() => check(false));
  }, [scrollCtx, check]);

  useEffect(() => {
    if (isCurrentPage) {
      check(true);
    }
  }, [isCurrentPage, check]);

  const ref = useCallback(
    (node: View | null) => {
      nodeRef.current = node;
      if (node != null) {
        check(true);
      }
    },
    [check]
  );

  const onLayout = useCallback(() => check(true), [check]);

  // A fresh object each render would defeat the memo on ExerciseHistory.
  return useMemo(() => ({ ref, onLayout }), [ref, onLayout]);
}
