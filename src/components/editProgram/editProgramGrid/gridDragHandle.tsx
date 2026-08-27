import { JSX, ReactNode, memo, useCallback, useEffect, useRef } from "react";
import { View, GestureResponderEvent, PointerEvent } from "react-native";

export interface IGridDragHandleProps {
  children: ReactNode;
  onDragStart: (absolute: number) => void;
  onDragMove: (translation: number, absolute: number) => void;
  // False when the touch was terminated rather than released, in which case the drop is dropped.
  onDragEnd: (commit: boolean) => void;
  // Handled here rather than by a nested Pressable, so tap and drag come from one place.
  onTap?: () => void;
  // Days and exercises stack down the grid, weeks run across it. Same gesture, different axis.
  axis?: "y" | "x";
}

// Kept in step with the native handle's threshold — see gridDragHandle.native.tsx.
const LONG_PRESS_MS = 500;
// Moving further than this before the long press lands means the user is scrolling, not dragging.
const SLOP = 8;
// A mouse never waits: the drag arms as soon as the pointer has clearly moved rather than jittered.
// Holding still for half a second is a touch idiom, and on a mouse it reads as the grid being dead
// — you press, you move, and SLOP cancels the press before the timer ever lands.
const MOUSE_THRESHOLD = 4;

// On the document rather than on the handle, because a drag is a state of the whole page: the
// cursor spends most of a drag somewhere else entirely, over rows this handle knows nothing about.
// Written straight to the DOM rather than through a style prop so that saying "you are dragging"
// costs no render — a re-render here would rebuild every cell in the row under the cursor.
function setDocumentCursor(cursor: string): void {
  if (typeof document !== "undefined") {
    document.body.style.cursor = cursor;
  }
}

// react-native-gesture-handler is stubbed to no-ops on web (utils/rnStubs/gestureHandler.js), so the
// press-then-drag is built from the responder system, which react-native-web implements.
//
// Two things about that system shape everything below. Start negotiation is won by the *deepest*
// view that wants the touch, so a cell's Pressable takes the press before this handle can see it —
// which is why a mouse drag arms by stealing the responder on move rather than by being granted it
// on press. And a responder is taken away by events that have nothing to do with the gesture, so
// the drag has to decline that; see onResponderTerminationRequest.
export const GridDragHandle = memo(function GridDragHandle(props: IGridDragHandleProps): JSX.Element {
  const { onDragStart, onDragMove, onDragEnd, onTap, axis } = props;
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isDraggingRef = useRef(false);
  // Which kind of pointer started this press, so the two idioms can differ without guessing from
  // the device. `pointerdown` is also the only place that says — a responder event has been
  // normalised into a fake touch by the time it arrives.
  const isMouseRef = useRef(false);

  const cancelTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const positionOf = useCallback(
    (e: { nativeEvent: { pageX: number; pageY: number } }) =>
      axis === "x" ? e.nativeEvent.pageX : e.nativeEvent.pageY,
    [axis]
  );

  // Where the press began, recorded whether or not this handle ends up owning it. That matters for
  // exercise strips: the cell's Pressable wins the press, so onResponderGrant may not arrive until
  // the drag is already several pixels along, and by then the grant's own coordinates are no use as
  // an origin. A DOM event doesn't care who the responder is.
  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      isMouseRef.current = e.nativeEvent.pointerType === "mouse";
      startRef.current = positionOf(e);
      isDraggingRef.current = false;
      cancelTimer();
    },
    [cancelTimer, positionOf]
  );

  const beginDrag = useCallback(() => {
    isDraggingRef.current = true;
    setDocumentCursor("grabbing");
    // From where the press began, not from wherever the drag armed: the translation the drop
    // resolves against has to share an origin with the long-press path, or a mouse drag lands short
    // of the cursor by however far it travelled before arming.
    onDragStart(startRef.current);
  }, [onDragStart]);

  // A drag outlives the element it started on — the cursor travels over other rows, the footer, the
  // window's edge — so the grabbing cursor has to be released whatever ends it, including an unmount
  // mid-drag. Only when this handle is the one holding it: a row unmounting after some *other*
  // drag's commit must not clear a cursor it never set.
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        setDocumentCursor("");
      }
    };
  }, []);

  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      if (isDraggingRef.current) {
        return;
      }
      if (isMouseRef.current) {
        // Granted after a move means this handle stole the responder from a nested Pressable, which
        // it only does past the threshold — so the drag starts here. Granted at the press itself
        // (a day name, with nothing nested to compete) leaves it to onMove, which arms on distance.
        if (Math.abs(positionOf(e) - startRef.current) > MOUSE_THRESHOLD) {
          beginDrag();
        }
        return;
      }
      timerRef.current = setTimeout(beginDrag, LONG_PRESS_MS);
    },
    [beginDrag, positionOf]
  );

  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      const absolute = positionOf(e);
      const delta = absolute - startRef.current;
      if (!isDraggingRef.current) {
        if (!isMouseRef.current) {
          if (Math.abs(delta) > SLOP) {
            cancelTimer();
          }
          return;
        }
        if (Math.abs(delta) <= MOUSE_THRESHOLD) {
          return;
        }
        beginDrag();
      }
      onDragMove(delta, absolute);
    },
    [beginDrag, cancelTimer, onDragMove, positionOf]
  );

  // Taking the responder off whoever holds it — for a strip, the cell's Pressable, whose press is
  // cancelled by the theft, so a completed drag can't also register as a tap.
  const onMoveShouldSetResponder = useCallback(
    (e: GestureResponderEvent) => {
      if (isDraggingRef.current) {
        return true;
      }
      // Touch keeps the long press: stealing on distance would take every scroll with it.
      return isMouseRef.current && Math.abs(positionOf(e) - startRef.current) > MOUSE_THRESHOLD;
    },
    [positionOf]
  );

  const onRelease = useCallback(
    (commit: boolean) => {
      cancelTimer();
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setDocumentCursor("");
        onDragEnd(commit);
      } else if (commit) {
        // Released before the drag armed, so it was a tap.
        onTap?.();
      }
    },
    [cancelTimer, onDragEnd, onTap]
  );
  const onResponderRelease = useCallback(() => onRelease(true), [onRelease]);
  const onResponderTerminate = useCallback(() => onRelease(false), [onRelease]);
  // The other reason a drag survives on web. The responder system hands the responder to whoever
  // asks, and three things ask in the middle of every drag: the text selection the cursor drags out
  // (`selectionchange`), the grid's own edge-scrolling (`scroll`), and a right-click
  // (`contextmenu`). Each arrives as a *termination*, which this component reads as "cancelled" and
  // throws the drop away. Refusing while a drag is live is the only hook RNW offers to say no —
  // see ResponderSystem.js, where these three are the only events a responder may decline.
  const onResponderTerminationRequest = useCallback(() => !isDraggingRef.current, []);

  return (
    <View
      // userSelect is belt and braces with the refusal above: it stops the selection ever starting,
      // so the drag neither has to decline termination nor leaves a trail of highlighted text
      // behind the cursor. The cursor says the surface can be picked up — inherited by the day and
      // week names, which are plain views; a cell sets its own, since it is a Pressable.
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
