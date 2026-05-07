import { JSX, ReactNode, useCallback, useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView, Gesture, GestureDetector } from "react-native-gesture-handler";
import { WorkoutScrollGestureContext } from "./workoutScrollGestureContext";

interface IWorkoutExercisePagerProps {
  currentEntryIndex: number;
  entryCount: number;
  windowWidth: number;
  pageHeight?: number;
  forceUpdateEntryIndex: boolean;
  onIndexChange: (next: number) => void;
  children: ReactNode;
}

export function WorkoutExercisePager(props: IWorkoutExercisePagerProps): JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const scrollGesture = useRef(Gesture.Native()).current;
  const { currentEntryIndex, windowWidth, forceUpdateEntryIndex, onIndexChange, pageHeight } = props;

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: currentEntryIndex * windowWidth, animated: false });
  }, [forceUpdateEntryIndex, windowWidth]);

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
    <WorkoutScrollGestureContext.Provider value={scrollGesture}>
      <GestureDetector gesture={scrollGesture}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={pageHeight != null ? { height: pageHeight } : undefined}
        >
          {props.children}
        </ScrollView>
      </GestureDetector>
    </WorkoutScrollGestureContext.Provider>
  );
}
