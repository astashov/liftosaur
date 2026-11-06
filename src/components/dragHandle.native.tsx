import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import type { IDragHandleProps } from "./dragHandle";
import { DragPress_longPressMs } from "../models/dragPress";

export type { IDragHandleProps } from "./dragHandle";

export const DragHandle = memo(function DragHandle(props: IDragHandleProps): JSX.Element {
  const { onDragStart, onDragMove, onDragEnd, onTap } = props;
  const touchesDown = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(DragPress_longPressMs)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onTouchesDown((e) => {
        touchesDown.value = e.numberOfTouches;
      })
      .onTouchesUp((e) => {
        touchesDown.value = e.numberOfTouches;
      })
      .onTouchesCancelled((e) => {
        touchesDown.value = e.numberOfTouches;
      })
      // iOS cancels the long-press timer in the recognizer's reset, after the failed release. When a
      // tap keeps the main thread busy past 500ms, the timer still activates the pan with no finger down.
      .onStart((e) => {
        if (touchesDown.value === 0) {
          return;
        }
        isDragging.value = true;
        runOnJS(onDragStart)({ x: e.absoluteX, y: e.absoluteY });
      })
      .onUpdate((e) => {
        if (!isDragging.value) {
          return;
        }
        runOnJS(onDragMove)({ x: e.translationX, y: e.translationY }, { x: e.absoluteX, y: e.absoluteY });
      })
      .onEnd(() => {
        if (!isDragging.value) {
          return;
        }
        isDragging.value = false;
        runOnJS(onDragEnd)(true);
      })
      .onFinalize((_e, success) => {
        if (!isDragging.value) {
          return;
        }
        isDragging.value = false;
        runOnJS(onDragEnd)(success);
      });
    if (onTap == null) {
      return pan;
    }
    const tap = Gesture.Tap().onEnd((_e, success) => {
      if (success) {
        runOnJS(onTap)();
      }
    });
    // Exclusive, not Race: racing them lets the tap cancel the pan a few pixels into the drag.
    return Gesture.Exclusive(pan, tap);
  }, [onDragStart, onDragMove, onDragEnd, onTap, touchesDown, isDragging]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{props.children}</View>
    </GestureDetector>
  );
});
