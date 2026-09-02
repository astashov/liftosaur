import { JSX, ReactNode, useCallback, useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { WorkoutPagerSettle_index } from "./workoutPagerSettle";

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
  const scrollRef = useRef<ScrollView>(null);
  const { currentEntryIndex, windowWidth, forceUpdateEntryIndex, onIndexChange, onSettledIndex, pageHeight } = props;
  // scrollTo never fires onScrollBeginDrag, which is what stops Android's spurious
  // onMomentumScrollEnd after one from being read as a swipe.
  const isUserDraggingRef = useRef(false);
  const dragStartIndexRef = useRef(currentEntryIndex);
  const currentEntryIndexRef = useRef(currentEntryIndex);
  currentEntryIndexRef.current = currentEntryIndex;

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: currentEntryIndex * windowWidth, animated: false });
  }, [forceUpdateEntryIndex, windowWidth]);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(fallbackTimerRef.current), []);

  const onScrollBeginDrag = useCallback((): void => {
    clearTimeout(fallbackTimerRef.current);
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
      const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
      if (selectedIndex === currentEntryIndex) {
        return;
      }
      onIndexChange(selectedIndex);
    },
    [currentEntryIndex, windowWidth, onIndexChange]
  );

  return (
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
  );
}
