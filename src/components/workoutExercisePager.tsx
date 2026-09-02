import { Children, JSX, ReactNode, useCallback, useEffect, useRef } from "react";
import { WorkoutPagerSettle_index } from "./workoutPagerSettle";

const WHEEL_GESTURE_MS = 300;

interface IWorkoutExercisePagerProps {
  currentEntryIndex: number;
  entryCount: number;
  windowWidth: number;
  pageHeight?: number;
  forceUpdateEntryIndex: boolean;
  onIndexChange: (next: number) => void;
  // User-driven scrolls only, and only where they came to rest.
  onSettledIndex?: (next: number) => void;
  children: ReactNode;
}

export function WorkoutExercisePager(props: IWorkoutExercisePagerProps): JSX.Element {
  const { currentEntryIndex, windowWidth, forceUpdateEntryIndex, onIndexChange, onSettledIndex } = props;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const dragStartIndexRef = useRef(currentEntryIndex);
  const currentEntryIndexRef = useRef(currentEntryIndex);
  currentEntryIndexRef.current = currentEntryIndex;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(idleTimerRef.current), []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: currentEntryIndex * windowWidth, behavior: "instant" as ScrollBehavior });
  }, [forceUpdateEntryIndex, windowWidth]);

  // An input only opens a window; the flag is set in onScroll, once the pager actually moved.
  // Arming on the input alone would count every bubbled tap inside the card as pager intent.
  // wheel is separate because a trackpad swipe fires no pointerdown.
  const pointerActiveRef = useRef(false);
  const lastWheelAtRef = useRef(0);

  const onPointerStart = useCallback(() => {
    if (!pointerActiveRef.current) {
      dragStartIndexRef.current = currentEntryIndexRef.current;
    }
    pointerActiveRef.current = true;
  }, []);

  const onPointerStop = useCallback(() => {
    pointerActiveRef.current = false;
  }, []);

  const onWheel = useCallback(() => {
    if (Date.now() - lastWheelAtRef.current > WHEEL_GESTURE_MS) {
      dragStartIndexRef.current = currentEntryIndexRef.current;
    }
    lastWheelAtRef.current = Date.now();
  }, []);

  const settle = useCallback((): void => {
    const isUserDriven = isUserScrollingRef.current;
    isUserScrollingRef.current = false;
    const index = WorkoutPagerSettle_index({
      offsetX: scrollerRef.current?.scrollLeft ?? 0,
      windowWidth,
      isUserDriven,
      dragStartIndex: dragStartIndexRef.current,
    });
    if (index != null) {
      onSettledIndex?.(index);
    }
  }, [windowWidth, onSettledIndex]);

  return (
    <div
      ref={scrollerRef}
      className="parent-scroller"
      onPointerDown={onPointerStart}
      onTouchStart={onPointerStart}
      onPointerUp={onPointerStop}
      onPointerCancel={onPointerStop}
      onTouchEnd={onPointerStop}
      onTouchCancel={onPointerStop}
      onWheel={onWheel}
      onScroll={() => {
        const scrollLeft = scrollerRef.current?.scrollLeft ?? 0;
        if (windowWidth <= 0) {
          return;
        }
        if (pointerActiveRef.current || Date.now() - lastWheelAtRef.current < WHEEL_GESTURE_MS) {
          isUserScrollingRef.current = true;
        }
        // Safari has no scrollend, so settle on the scroll going quiet instead.
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(settle, 150);
        const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
        if (selectedIndex !== currentEntryIndex) {
          onIndexChange(selectedIndex);
        }
      }}
      style={{
        display: "flex",
        overflowX: "scroll",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollSnapType: "x mandatory",
      }}
    >
      {Children.map(props.children, (child, index) => (
        <div
          key={index}
          style={{
            minWidth: "100vw",
            scrollSnapAlign: "center",
            scrollSnapStop: "always",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
