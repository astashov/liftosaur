import { JSX, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { WorkoutPagerSettle_index } from "./workoutPagerSettle";
import { WorkoutPagerHeightContext } from "./workoutPagerHeightContext";
import {
  WorkoutPagerScroll_gestureHeight,
  WorkoutPagerScroll_plan,
  WorkoutPagerScroll_read,
  WorkoutPagerScroll_shownIndex,
  WorkoutPagerScroll_snapOffset,
} from "../utils/workoutPagerScroll";

interface IWorkoutExercisePagerProps {
  currentEntryIndex: number;
  currentEntryId: string;
  entryCount: number;
  windowWidth: number;
  forceUpdateEntryIndex: boolean;
  onIndexChange: (next: number, isUserDriven: boolean) => void;
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
  // Android's HorizontalScrollView.onSizeChanged scrolls back to a focused input, and a resize
  // during the snap animation can stop it short. So the height stays fixed until the pager settles.
  const [gestureHeight, setGestureHeight] = useState<number | undefined>(undefined);
  const pageHeight = gestureHeight ?? pageHeights[currentEntryIndex];
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

  // A touch during the snap animation cancels it without an onMomentumScrollEnd, so a drag start
  // is the only place this can be reset.
  const isMomentumRef = useRef(false);
  const isFingerDraggingRef = useRef(false);

  const onScrollBeginDrag = useCallback((): void => {
    clearTimeout(fallbackTimerRef.current);
    ownSlideTargetRef.current = undefined;
    isMomentumRef.current = false;
    isFingerDraggingRef.current = true;
    isUserDraggingRef.current = true;
    dragStartIndexRef.current = currentEntryIndexRef.current;
    setGestureHeight(WorkoutPagerScroll_gestureHeight(pageHeights, currentEntryIndexRef.current));
  }, [pageHeights]);

  const snapToPage = useCallback(
    (offsetX: number): void => {
      const snapOffset = WorkoutPagerScroll_snapOffset(offsetX, windowWidth);
      if (snapOffset != null) {
        scrollRef.current?.scrollTo({ x: snapOffset, animated: true });
      }
    },
    [windowWidth]
  );

  const settle = useCallback(
    (offsetX: number): void => {
      setGestureHeight(undefined);
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
  // onMomentumScrollEnd. The timer covers a drag that never starts momentum: Android snaps only on
  // ACTION_UP, so a touch cancelled by another gesture stops between pages and gets snapped here.
  const settleWithoutMomentum = useCallback((): void => {
    isFingerDraggingRef.current = false;
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      if (isMomentumRef.current || ownSlideTargetRef.current != null) {
        return;
      }
      settle(offsetXRef.current);
      snapToPage(offsetXRef.current);
    }, 250);
  }, [settle, snapToPage]);

  const onMomentumScrollBegin = useCallback((): void => {
    isMomentumRef.current = true;
    clearTimeout(fallbackTimerRef.current);
  }, []);

  // RN Android cancels its post-touch runnable only when onTouchEvent sees ACTION_DOWN. A drag that
  // starts on a child and is intercepted keeps the old runnable, which then ends the momentum under
  // the finger and makes the next release skip its own snap.
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
      isMomentumRef.current = false;
      if (isFingerDraggingRef.current) {
        return;
      }
      clearTimeout(fallbackTimerRef.current);
      settle(e.nativeEvent.contentOffset.x);
      snapToPage(e.nativeEvent.contentOffset.x);
    },
    [settle, snapToPage]
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
        onIndexChange(read.reportIndex, isUserDraggingRef.current);
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
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={settleWithoutMomentum}
        onEnded={settleWithoutMomentum}
        onCancelled={settleWithoutMomentum}
        onFailed={settleWithoutMomentum}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={pageHeight != null ? { height: pageHeight } : undefined}
      >
        {props.children}
      </ScrollView>
    </WorkoutPagerHeightContext.Provider>
  );
}
