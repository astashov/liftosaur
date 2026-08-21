import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IGridResizeHandleProps {
  width: number;
  // Whole weeks the drag currently spans, positive to the right. Reported live so the strip can
  // show the extent it would commit to, and once more on release to commit it.
  onResize: (deltaWeeks: number) => void;
  onResizeEnd: () => void;
  columnWidth: number;
  // Placed by the lane rather than hugging a cell: it lives outside the lane's drag detector, so
  // that a touch landing on it can't be taken by the exercise drag's long press.
  left: number;
  top: number;
  height: number;
  // How far the handle currently sits from its committed position. A shared value rather than a
  // changing `left`, because the finger is on this view: re-rendering it every frame rebuilds the
  // subtree under an active pan, which is what cancels one.
  offsetX: SharedValue<number>;
}

export const GridResizeHandle = memo(function GridResizeHandle(props: IGridResizeHandleProps): JSX.Element {
  const { columnWidth, onResize, onResizeEnd } = props;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // Claims the drag only once it is clearly horizontal, so the grid's own horizontal scroll
        // still wins for a finger that starts moving anywhere but this handle.
        .activeOffsetX([-6, 6])
        .onUpdate((e) => {
          runOnJS(onResize)(Math.round(e.translationX / columnWidth));
        })
        .onEnd(() => {
          runOnJS(onResizeEnd)();
        })
        .onFinalize(() => {
          runOnJS(onResizeEnd)();
        }),
    [columnWidth, onResize, onResizeEnd]
  );

  const followStyle = useAnimatedStyle(() => ({ transform: [{ translateX: props.offsetX.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className="absolute items-center justify-center"
        style={[{ width: props.width, left: props.left, top: props.top, height: props.height }, followStyle]}
        testID="grid-resize-handle"
        accessibilityLabel="Drag to change how many weeks this repeats for"
      >
        <View
          style={{
            width: 3,
            height: "45%",
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          }}
        />
      </Animated.View>
    </GestureDetector>
  );
});
