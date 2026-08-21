import { JSX, memo, useCallback, useRef } from "react";
import { View, GestureResponderEvent } from "react-native";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IGridResizeHandleProps {
  width: number;
  // Whole weeks the drag currently spans, positive to the right. Reported live so the strip can
  // show the extent it would commit to, and once more on release to commit it.
  onResize: (deltaWeeks: number) => void;
  // False when the gesture was terminated rather than released — see the native variant.
  onResizeEnd: (commit: boolean) => void;
  columnWidth: number;
  // Placed by the lane rather than hugging a cell — see the native variant.
  left: number;
  top: number;
  height: number;
  // Unused on web: Reanimated is stubbed here, and the responder-based handle below has no pan for
  // a re-render to cancel, so the preview stays state-driven and `left` moves with it.
  offsetX: unknown;
}

// react-native-gesture-handler is stubbed to no-ops on web (utils/rnStubs/gestureHandler.js), so
// this uses the responder system, which react-native-web implements in full.
export const GridResizeHandle = memo(function GridResizeHandle(props: IGridResizeHandleProps): JSX.Element {
  const { columnWidth, onResize, onResizeEnd } = props;
  const startXRef = useRef(0);

  const onGrant = useCallback((e: GestureResponderEvent) => {
    startXRef.current = e.nativeEvent.pageX;
  }, []);

  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      onResize(Math.round((e.nativeEvent.pageX - startXRef.current) / columnWidth));
    },
    [columnWidth, onResize]
  );

  return (
    <View
      className="absolute items-center justify-center"
      style={
        { width: props.width, left: props.left, top: props.top, height: props.height, cursor: "col-resize" } as object
      }
      testID="grid-resize-handle"
      accessibilityLabel="Drag to change how many weeks this repeats for"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={() => onResizeEnd(true)}
      onResponderTerminate={() => onResizeEnd(false)}
    >
      <View
        style={{
          width: 3,
          height: "45%",
          borderRadius: 2,
          backgroundColor: Tailwind_semantic().icon.purple,
        }}
      />
    </View>
  );
});
