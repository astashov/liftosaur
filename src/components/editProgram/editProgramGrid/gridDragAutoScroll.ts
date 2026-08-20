import { RefObject, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { NavScreenScrollContext } from "../../../navigation/NavScreenScrollContext";

// How close to the edge of the visible area the finger has to get before the page starts following
// it, and how fast it may run. Same numbers as the editor's reorder, which were tuned on device.
const autoScrollZone = 56;
const autoScrollMaxStep = 14;
const autoScrollIntervalMs = 16;

// Re-runs the drag's own math with the translation the scroll has added to it. The drags work in
// screen-space translations, so a page that moves under a still finger changes where the finger
// points without changing the translation at all.
type IApplyDrag = (translation: number) => void;

export interface IGridDragAutoScroll {
  begin: (axis: "x" | "y", absolute: number, apply: IApplyDrag) => void;
  move: (translation: number, absolute: number) => void;
  end: () => void;
}

interface IGridDragAutoScrollOptions {
  // The grid's own horizontal scroller and the box it shows through, for week drags.
  horizontalRef: RefObject<ScrollView | null>;
  horizontalViewportRef: RefObject<View | null>;
  horizontalOffsetRef: RefObject<number>;
  maxHorizontalScroll: () => number;
}

export function useGridDragAutoScroll(options: IGridDragAutoScrollOptions): IGridDragAutoScroll {
  const scrollCtx = useContext(NavScreenScrollContext);
  const axisRef = useRef<"x" | "y">("y");
  const applyRef = useRef<IApplyDrag | undefined>(undefined);
  const lastTranslationRef = useRef(0);
  const absoluteRef = useRef(0);
  // Where the scroll was when the drag started: everything the drag computes is relative to it.
  const scrollAtStartRef = useRef(0);
  // Where auto-scroll has asked the scroller to be. The scroller's own reported offset trails by a
  // frame or two, which the eye reads as the ghost sliding off the finger.
  const targetRef = useRef<number | undefined>(undefined);
  const boundsRef = useRef<{ start: number; end: number } | undefined>(undefined);
  const maxVerticalRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return scrollCtx?.addScrollListener((e) => {
      maxVerticalRef.current = Math.max(0, e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height);
    });
  }, [scrollCtx]);

  const { horizontalOffsetRef, horizontalRef, horizontalViewportRef, maxHorizontalScroll } = options;

  const scrollNow = useCallback(() => {
    if (targetRef.current != null) {
      return targetRef.current;
    }
    return axisRef.current === "y" ? (scrollCtx?.scrollYRef.current ?? 0) : horizontalOffsetRef.current;
  }, [scrollCtx, horizontalOffsetRef]);

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const tick = useCallback(() => {
    const bounds = boundsRef.current;
    const apply = applyRef.current;
    const node = axisRef.current === "y" ? scrollCtx?.scrollRef.current : horizontalRef.current;
    if (bounds == null || apply == null || node == null) {
      return;
    }
    const position = absoluteRef.current;
    const overStart = bounds.start + autoScrollZone - position;
    const overEnd = position - (bounds.end - autoScrollZone);
    const depth = overStart > 0 ? -overStart : overEnd > 0 ? overEnd : 0;
    if (depth === 0) {
      return;
    }
    const step = Math.sign(depth) * Math.min(autoScrollMaxStep, (Math.abs(depth) / autoScrollZone) * autoScrollMaxStep);
    // The vertical extent is only known once the screen has reported a scroll, which it may never
    // have done when the grid is opened and dragged straight away. Rather than refusing to scroll
    // until then, watch whether the scroller actually went where it was asked: if it stopped
    // following, it has run out of content, and the target is corrected to where it really is.
    // Without that, a drag held past the end would keep adding scroll that never happened, and the
    // ghost would sail off the finger.
    const reported = axisRef.current === "y" ? (scrollCtx?.scrollYRef.current ?? 0) : horizontalOffsetRef.current;
    if (targetRef.current != null && Math.abs(reported - targetRef.current) > autoScrollMaxStep * 2) {
      targetRef.current = reported;
      return;
    }
    const knownMax = axisRef.current === "y" ? maxVerticalRef.current : maxHorizontalScroll();
    const max = knownMax > 0 ? knownMax : Number.MAX_SAFE_INTEGER;
    const current = scrollNow();
    const next = Math.min(Math.max(0, current + step), max);
    if (next === current) {
      return;
    }
    targetRef.current = next;
    node.scrollTo(axisRef.current === "y" ? { y: next, animated: false } : { x: next, animated: false });
    apply(lastTranslationRef.current + (next - scrollAtStartRef.current));
  }, [scrollCtx, horizontalRef, horizontalOffsetRef, maxHorizontalScroll, scrollNow]);

  const begin = useCallback(
    (axis: "x" | "y", absolute: number, apply: IApplyDrag) => {
      axisRef.current = axis;
      applyRef.current = apply;
      lastTranslationRef.current = 0;
      absoluteRef.current = absolute;
      targetRef.current = undefined;
      scrollAtStartRef.current = scrollNow();
      boundsRef.current = undefined;
      if (axis === "y") {
        // Measured rather than derived from the window: on Android edge-to-edge the window and
        // measureInWindow don't share an origin. The sticky header and the dock cover the ends of
        // the scroll area, and dragging into what they cover should still scroll.
        scrollCtx?.viewportRef.current?.measureInWindow((_x, y, _width, height) => {
          boundsRef.current = {
            start: y + (scrollCtx?.stickyHeaderHeight ?? 0),
            end: y + height - (scrollCtx?.footerHeight ?? 0),
          };
        });
      } else {
        horizontalViewportRef.current?.measureInWindow((x, _y, width) => {
          boundsRef.current = { start: x, end: x + width };
        });
      }
      stop();
      timerRef.current = setInterval(tick, autoScrollIntervalMs);
    },
    [scrollCtx, horizontalViewportRef, scrollNow, stop, tick]
  );

  const move = useCallback(
    (translation: number, absolute: number) => {
      lastTranslationRef.current = translation;
      absoluteRef.current = absolute;
      applyRef.current?.(translation + (scrollNow() - scrollAtStartRef.current));
    },
    [scrollNow]
  );

  const end = useCallback(() => {
    stop();
    applyRef.current = undefined;
    targetRef.current = undefined;
    boundsRef.current = undefined;
  }, [stop]);

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ begin, move, end }), [begin, move, end]);
}
