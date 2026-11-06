import { JSX, ReactNode, memo, useCallback, useEffect, useRef } from "react";
import { View, GestureResponderEvent, PointerEvent } from "react-native";
import { GridDragAutoScroll_toViewport } from "./editProgram/editProgramGrid/gridDragAutoScroll";
import {
  DragPress_idle,
  DragPress_longPressMs,
  DragPress_takesResponderOnMove,
  DragPress_transition,
  DragPress_yieldsResponder,
  IDragPoint,
  IDragPressEffect,
  IDragPressEvent,
  IDragPressState,
} from "../models/dragPress";

export interface IDragHandleProps {
  children: ReactNode;
  onDragStart: (at: IDragPoint) => void;
  onDragMove: (translation: IDragPoint, at: IDragPoint) => void;
  onDragEnd: (commit: boolean) => void;
  onTap?: () => void;
}

function viewportPointOf(e: { nativeEvent: { pageX: number; pageY: number } }): IDragPoint {
  return {
    x: GridDragAutoScroll_toViewport(e.nativeEvent.pageX, window.scrollX),
    y: GridDragAutoScroll_toViewport(e.nativeEvent.pageY, window.scrollY),
  };
}

// react-native-gesture-handler is stubbed to no-ops on web (utils/rnStubs/gestureHandler.js), so the
// press-then-drag is built from the responder system.
export const DragHandle = memo(function DragHandle(props: IDragHandleProps): JSX.Element {
  const stateRef = useRef<IDragPressState>(DragPress_idle);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const propsRef = useRef(props);
  propsRef.current = props;
  const runRef = useRef<(event: IDragPressEvent) => void>(() => undefined);

  const apply = useCallback((effect: IDragPressEffect) => {
    switch (effect.type) {
      case "startTimer":
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runRef.current({ type: "longPress" }), DragPress_longPressMs);
        break;
      case "cancelTimer":
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
        break;
      case "cursor":
        if (typeof document !== "undefined") {
          document.body.style.cursor = effect.value;
        }
        break;
      case "dragStart":
        propsRef.current.onDragStart(effect.at);
        break;
      case "dragMove":
        propsRef.current.onDragMove(effect.translation, effect.at);
        break;
      case "dragEnd":
        propsRef.current.onDragEnd(effect.commit);
        break;
      case "tap":
        propsRef.current.onTap?.();
        break;
    }
  }, []);

  const run = useCallback(
    (event: IDragPressEvent) => {
      const result = DragPress_transition(stateRef.current, event);
      stateRef.current = result.state;
      result.effects.forEach(apply);
    },
    [apply]
  );
  runRef.current = run;

  useEffect(() => () => run({ type: "unmount" }), [run]);

  const onPointerDown = useCallback(
    (e: PointerEvent) =>
      run({ type: "pointerDown", at: viewportPointOf(e), isMouse: e.nativeEvent.pointerType === "mouse" }),
    [run]
  );
  const onGrant = useCallback((e: GestureResponderEvent) => run({ type: "grant", at: viewportPointOf(e) }), [run]);
  const onMove = useCallback((e: GestureResponderEvent) => run({ type: "move", at: viewportPointOf(e) }), [run]);
  const onMoveShouldSetResponder = useCallback(
    (e: GestureResponderEvent) => DragPress_takesResponderOnMove(stateRef.current, viewportPointOf(e)),
    []
  );
  const onResponderRelease = useCallback(() => run({ type: "release", commit: true }), [run]);
  const onResponderTerminate = useCallback(() => run({ type: "release", commit: false }), [run]);
  // Text selection, edge-scrolling and right-click take the responder mid-drag; RNW's ResponderSystem.js
  // lets a responder decline only these. A mouse press declines from the start, since a selection begins
  // before the drag does; a touch press yields, since that is how a scroll begins.
  const onResponderTerminationRequest = useCallback(() => DragPress_yieldsResponder(stateRef.current), []);

  return (
    <View
      style={{ userSelect: "none", cursor: "grab" } as object}
      onPointerDown={onPointerDown}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={onMoveShouldSetResponder}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onResponderRelease}
      onResponderTerminate={onResponderTerminate}
      onResponderTerminationRequest={onResponderTerminationRequest}
    >
      {props.children}
    </View>
  );
});
