import { JSX, ReactNode, memo, useCallback, useRef } from "react";
import { View, GestureResponderEvent } from "react-native";

export interface IGridDragHandleProps {
  children: ReactNode;
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  // False when the touch was terminated rather than released, in which case the drop is dropped.
  onDragEnd: (commit: boolean) => void;
  // Handled here rather than by a nested Pressable, so tap and drag come from one place.
  onTap?: () => void;
}

const LONG_PRESS_MS = 200;
// Moving further than this before the long press lands means the user is scrolling, not dragging.
const SLOP = 8;

// react-native-gesture-handler is stubbed to no-ops on web (utils/rnStubs/gestureHandler.js), so the
// long-press-then-drag is built from the responder system, which react-native-web implements.
export const GridDragHandle = memo(function GridDragHandle(props: IGridDragHandleProps): JSX.Element {
  const { onDragStart, onDragMove, onDragEnd, onTap } = props;
  const startYRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isDraggingRef = useRef(false);

  const cancelTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      startYRef.current = e.nativeEvent.pageY;
      isDraggingRef.current = false;
      cancelTimer();
      timerRef.current = setTimeout(() => {
        isDraggingRef.current = true;
        onDragStart();
      }, LONG_PRESS_MS);
    },
    [cancelTimer, onDragStart]
  );

  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - startYRef.current;
      if (!isDraggingRef.current) {
        if (Math.abs(dy) > SLOP) {
          cancelTimer();
        }
        return;
      }
      onDragMove(dy);
    },
    [cancelTimer, onDragMove]
  );

  const onRelease = useCallback(
    (commit: boolean) => {
      cancelTimer();
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd(commit);
      } else if (commit) {
        // Released before the long press landed, so it was a tap.
        onTap?.();
      }
    },
    [cancelTimer, onDragEnd, onTap]
  );
  const onResponderRelease = useCallback(() => onRelease(true), [onRelease]);
  const onResponderTerminate = useCallback(() => onRelease(false), [onRelease]);

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => isDraggingRef.current}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onResponderRelease}
      onResponderTerminate={onResponderTerminate}
    >
      {props.children}
    </View>
  );
});
