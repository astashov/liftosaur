import { JSX, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { WorkoutPagerSettle_index } from "./workoutPagerSettle";
import { WorkoutPagerHeightContext } from "./workoutPagerHeightContext";
import {
  WorkoutPagerScroll_plan,
  WorkoutPagerScroll_read,
  WorkoutPagerScroll_shownIndex,
} from "../utils/workoutPagerScroll";

interface IWorkoutExercisePagerProps {
  currentEntryIndex: number;
  currentEntryId: string;
  entryCount: number;
  windowWidth: number;
  forceUpdateEntryIndex: boolean;
  onIndexChange: (next: number) => void;
  // User-driven scrolls only, and only where they came to rest.
  onSettledIndex?: (next: number) => void;
  children: ReactNode;
}

export function WorkoutExercisePager(props: IWorkoutExercisePagerProps): JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const { currentEntryIndex, currentEntryId, windowWidth, forceUpdateEntryIndex, onIndexChange, onSettledIndex } =
    props;
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const onPageLayout = useCallback((entryIndex: number, height: number) => {
    if (height <= 0) {
      return;
    }
    setPageHeights((prev) => (prev[entryIndex] === height ? prev : { ...prev, [entryIndex]: height }));
  }, []);
  const pageHeight = pageHeights[currentEntryIndex];
  // scrollTo never fires onScrollBeginDrag, which is what stops Android's spurious
  // onMomentumScrollEnd after one from being read as a swipe.
  const isUserDraggingRef = useRef(false);
  const dragStartIndexRef = useRef(currentEntryIndex);
  const currentEntryIndexRef = useRef(currentEntryIndex);
  currentEntryIndexRef.current = currentEntryIndex;

  const offsetXRef = useRef(0);
  const ownSlideTargetRef = useRef<number | undefined>(undefined);
  const positionedWidthRef = useRef<number | undefined>(undefined);
  const previousEntryIdRef = useRef(currentEntryId);
  useEffect(() => {
    const isNavigation = positionedWidthRef.current === windowWidth && previousEntryIdRef.current !== currentEntryId;
    positionedWidthRef.current = windowWidth;
    const shownIndex = WorkoutPagerScroll_shownIndex(offsetXRef.current, windowWidth);
    const plan = WorkoutPagerScroll_plan(shownIndex, currentEntryIndex, isNavigation);
    ownSlideTargetRef.current = plan.ownSlideTarget;
    scrollRef.current?.scrollTo({ x: currentEntryIndex * windowWidth, animated: plan.animated });
  }, [forceUpdateEntryIndex, windowWidth]);
  useEffect(() => {
    previousEntryIdRef.current = currentEntryId;
  }, [currentEntryId]);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(fallbackTimerRef.current), []);

  const onScrollBeginDrag = useCallback((): void => {
    clearTimeout(fallbackTimerRef.current);
    ownSlideTargetRef.current = undefined;
    isUserDraggingRef.current = true;
    dragStartIndexRef.current = currentEntryIndexRef.current;
  }, []);

  const settle = useCallback(
    (offsetX: number): void => {
      const isUserDriven = isUserDraggingRef.current;
      isUserDraggingRef.current = false;
      const index = WorkoutPagerSettle_index({
        offsetX,
        windowWidth,
        isUserDriven,
        dragStartIndex: dragStartIndexRef.current,
      });
      if (index != null) {
        onSettledIndex?.(index);
      }
    },
    [windowWidth, onSettledIndex]
  );

  // A flick keeps gliding after the finger lifts, so the destination arrives with
  // onMomentumScrollEnd; the timer only covers a slow drag that never starts momentum.
  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const offsetX = e.nativeEvent.contentOffset.x;
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => settle(offsetX), 250);
    },
    [settle]
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
      clearTimeout(fallbackTimerRef.current);
      settle(e.nativeEvent.contentOffset.x);
    },
    [settle]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
      if (windowWidth <= 0) {
        return;
      }
      const scrollLeft = e.nativeEvent.contentOffset.x;
      offsetXRef.current = scrollLeft;
      const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
      const read = WorkoutPagerScroll_read(ownSlideTargetRef.current, selectedIndex, currentEntryIndex);
      ownSlideTargetRef.current = read.ownSlideTarget;
      if (read.reportIndex != null) {
        onIndexChange(read.reportIndex);
      }
    },
    [currentEntryIndex, windowWidth, onIndexChange]
  );

  return (
    <WorkoutPagerHeightContext.Provider value={onPageLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={pageHeight != null ? { height: pageHeight } : undefined}
      >
        {props.children}
      </ScrollView>
    </WorkoutPagerHeightContext.Provider>
  );
}
