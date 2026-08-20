import { JSX, ReactNode, memo, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export interface IGridDragHandleProps {
  children: ReactNode;
  // Long press first, so a plain tap still selects and the grid still scrolls under the finger.
  // The absolute position of the finger comes along with both, because edge-scrolling has to know
  // where on the screen the finger is, which a translation alone can't say.
  onDragStart: (absolute: number) => void;
  onDragMove: (translation: number, absolute: number) => void;
  // `commit` is false when the gesture was cancelled rather than released — the drop must not be
  // applied then. onEnd and onFinalize both fire on a normal release, so this has to be idempotent.
  onDragEnd: (commit: boolean) => void;
  // When the tap belongs to the same target as the drag, it has to be handled here too: a Pressable
  // nested under the detector claims the touch before the long press can promote it to a drag.
  onTap?: () => void;
  // Days and exercises stack down the grid, weeks run across it. Same gesture, different axis.
  axis?: "y" | "x";
}

export const GridDragHandle = memo(function GridDragHandle(props: IGridDragHandleProps): JSX.Element {
  const { onDragStart, onDragMove, onDragEnd, onTap, axis } = props;
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(200)
      // The finger leaves a small handle almost immediately once the drag is under way; without
      // this the gesture is cancelled the moment it does.
      .shouldCancelWhenOutside(false)
      .onStart((e) => {
        runOnJS(onDragStart)(axis === "x" ? e.absoluteX : e.absoluteY);
      })
      .onUpdate((e) => {
        runOnJS(onDragMove)(axis === "x" ? e.translationX : e.translationY, axis === "x" ? e.absoluteX : e.absoluteY);
      })
      .onEnd(() => {
        runOnJS(onDragEnd)(true);
      })
      .onFinalize((_e, success) => {
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
    // Exclusive, not Race: the pan has priority and the tap only gets a look in once the pan has
    // failed — which is what a quick release is. Racing them lets the tap cancel the pan a few
    // pixels into the drag, which killed the gesture outright.
    return Gesture.Exclusive(pan, tap);
  }, [onDragStart, onDragMove, onDragEnd, onTap, axis]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{props.children}</View>
    </GestureDetector>
  );
});
