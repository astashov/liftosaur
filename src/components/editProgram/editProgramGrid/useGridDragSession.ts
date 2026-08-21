import { useCallback, useMemo, useRef } from "react";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";

// One drag, in the shape all three of the grid's drags share: a pointer position resolves to a drop
// target, the target is shown, and on release it is committed. Days, exercises and weeks differ only
// in `resolve` (pure, in programGridGeometry) and `commit` (a transform) — everything that made the
// drags fragile is here, once:
//
//   - The target lives in a ref, written synchronously as the finger moves. Nothing calls setState,
//     because a render under the finger is what gesture-handler cancels the pan for.
//   - `show` may only write Reanimated shared values, for the same reason.
//   - The handlers keep their identity for the whole drag — a rebuilt gesture drops the drag — so
//     the callbacks come through refs rather than through the dependency array.
//   - `onDragEnd` is idempotent, because onEnd *and* onFinalize both fire on a normal release, and
//     onFinalize alone fires on a cancel.
//   - Edge-scrolling re-runs `resolve` on its own timer: while the page moves under a still finger
//     no gesture events arrive, but where the finger points keeps changing.
export interface IGridDragSession {
  onDragStart: (absolute: number) => void;
  onDragMove: (translation: number, absolute: number) => void;
  onDragEnd: (commit: boolean) => void;
}

export interface IGridDragSessionOptions<TTarget> {
  axis: "x" | "y";
  autoScroll: IGridDragAutoScroll;
  // Where the drag would land, given how far the finger has travelled from where it started. Pure:
  // the same translation always resolves to the same target, and nothing else happens.
  resolve: (translation: number) => TTarget | undefined;
  // Draw it. Called with the target on every move, and with undefined when the drag is over.
  //
  // The raw translation comes too, because where a drag *lands* and where it should be *drawn* are
  // different questions: the target snaps to a row or a column, while the floating copy follows the
  // finger. Without it, the two drags that need both smuggled the translation past the contract —
  // one by writing a ref from inside `resolve`, the other by hanging a preview coordinate on its
  // semantic target.
  show: (target: TTarget | undefined, translation: number) => void;
  commit: (target: TTarget) => void;
}

export function useGridDragSession<TTarget>(options: IGridDragSessionOptions<TTarget>): IGridDragSession {
  const { autoScroll, axis } = options;
  const targetRef = useRef<TTarget | undefined>(undefined);
  // Refreshed every render, read only from handlers — which run long after it, so they always see
  // the current geometry without being rebuilt when it changes.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const apply = useCallback((translation: number) => {
    const target = optionsRef.current.resolve(translation);
    targetRef.current = target;
    optionsRef.current.show(target, translation);
  }, []);

  const onDragStart = useCallback(
    (absolute: number) => {
      apply(0);
      autoScroll.begin(axis, absolute, apply);
    },
    [apply, autoScroll, axis]
  );

  const onDragMove = useCallback(
    (translation: number, absolute: number) => {
      autoScroll.move(translation, absolute);
    },
    [autoScroll]
  );

  const onDragEnd = useCallback(
    (commit: boolean) => {
      autoScroll.end();
      const target = targetRef.current;
      targetRef.current = undefined;
      optionsRef.current.show(undefined, 0);
      if (commit && target !== undefined) {
        optionsRef.current.commit(target);
      }
    },
    [autoScroll]
  );

  // Memoized because the whole chain above it is: useGridLaneDrag's callbacks depend on this
  // object, useGridDrags spreads that into the bus, and every row reads the bus — so a fresh object
  // here re-renders every row on every parent render, including under a live finger.
  return useMemo(() => ({ onDragStart, onDragMove, onDragEnd }), [onDragStart, onDragMove, onDragEnd]);
}
