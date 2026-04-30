import { JSX, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { SendMessage_isIosOrAndroid } from "../utils/sendMessage";

export interface ILineChartGesturesArgs {
  plotWidth: number;
  padLeft: number;
  viewport: { xMin: number; xMax: number };
  setViewport: (vp: { xMin: number; xMax: number }) => void;
  resetViewport: () => void;
  setCursorAtPx: (xPx: number) => number | null;
  clearCursor: () => void;
}

export interface ILineChartGesturesResult {
  Wrap: (props: { children: ReactNode; style: StyleProp<ViewStyle> }) => JSX.Element;
  frozen: boolean;
  clearFrozen: () => void;
}

export function useLineChartGestures(args: ILineChartGesturesArgs): ILineChartGesturesResult {
  const argsRef = useRef(args);
  argsRef.current = args;

  const [node, setNode] = useState<HTMLElement | null>(null);
  const setContainerRef = useCallback((el: View | null) => {
    setNode((el as unknown as HTMLElement | null) ?? null);
  }, []);

  const [frozen, setFrozen] = useState(false);
  const frozenRef = useRef(frozen);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  const clearFrozen = useCallback(() => {
    setFrozen(false);
  }, []);

  useEffect(() => {
    if (!node) {
      return;
    }

    const isWebview = SendMessage_isIosOrAndroid();

    let dragStart: { clientX: number; xMin: number; xMax: number; moved: boolean } | null = null;

    const updateCursorAtClient = (clientX: number): number | null => {
      const rect = node.getBoundingClientRect();
      const xPx = clientX - rect.left;
      return argsRef.current.setCursorAtPx(xPx);
    };

    const onMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) {
        return;
      }
      const v = argsRef.current.viewport;
      dragStart = { clientX: e.clientX, xMin: v.xMin, xMax: v.xMax, moved: false };
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent): void => {
      if (dragStart) {
        const dx = e.clientX - dragStart.clientX;
        if (Math.abs(dx) > 2) {
          dragStart.moved = true;
        }
        const pw = argsRef.current.plotWidth;
        if (pw <= 0) {
          return;
        }
        const range = dragStart.xMax - dragStart.xMin;
        const deltaSec = -(dx / pw) * range;
        argsRef.current.setViewport({
          xMin: dragStart.xMin + deltaSec,
          xMax: dragStart.xMax + deltaSec,
        });
        return;
      }
      if (frozenRef.current) {
        return;
      }
      updateCursorAtClient(e.clientX);
    };

    const onMouseUp = (e: MouseEvent): void => {
      if (dragStart && !dragStart.moved) {
        const idx = updateCursorAtClient(e.clientX);
        if (idx != null) {
          setFrozen(true);
        }
      }
      dragStart = null;
    };

    const onMouseLeave = (): void => {
      if (!dragStart && !frozenRef.current) {
        argsRef.current.clearCursor();
      }
    };

    const onWheel = (e: WheelEvent): void => {
      if (!frozenRef.current) {
        return;
      }
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const v = argsRef.current.viewport;
      const pw = argsRef.current.plotWidth;
      if (pw <= 0) {
        return;
      }
      const range = v.xMax - v.xMin;
      const focalPct = Math.max(0, Math.min(1, (focalX - argsRef.current.padLeft) / pw));
      const xAtFocal = v.xMin + focalPct * range;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newRange = range / zoomFactor;
      const newXMin = xAtFocal - focalPct * newRange;
      argsRef.current.setViewport({ xMin: newXMin, xMax: newXMin + newRange });
    };

    const onDocMouseDown = (e: MouseEvent): void => {
      if (!frozenRef.current) {
        return;
      }
      const target = e.target as Node | null;
      if (target && node.contains(target)) {
        return;
      }
      setFrozen(false);
      argsRef.current.clearCursor();
    };

    const onDblClick = (e: MouseEvent): void => {
      e.preventDefault();
      argsRef.current.resetViewport();
      setFrozen(false);
    };

    let twoTouch: {
      startDist: number;
      startCenterX: number;
      xMin: number;
      xMax: number;
      padLeft: number;
      plotWidth: number;
    } | null = null;
    let singleTap: { startX: number; startY: number; startTime: number; moved: boolean } | null = null;
    let lastTapTime = 0;
    let lastTapX = 0;

    let scrub: { active: boolean; timer: number | null; startX: number; startY: number } | null = null;
    const SCRUB_HOLD_MS = 200;
    const SCRUB_CANCEL_PX = 10;

    const cancelScrubTimer = (): void => {
      if (scrub && scrub.timer != null) {
        window.clearTimeout(scrub.timer);
        scrub.timer = null;
      }
    };

    const touchDistance = (a: Touch, b: Touch): number => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const rect = node.getBoundingClientRect();
        const centerX = (a.clientX + b.clientX) / 2 - rect.left;
        const v = argsRef.current.viewport;
        twoTouch = {
          startDist: Math.max(1, touchDistance(a, b)),
          startCenterX: centerX,
          xMin: v.xMin,
          xMax: v.xMax,
          padLeft: argsRef.current.padLeft,
          plotWidth: argsRef.current.plotWidth,
        };
        singleTap = null;
        cancelScrubTimer();
        scrub = null;
      } else if (e.touches.length === 1 && !twoTouch) {
        const t = e.touches[0];
        singleTap = {
          startX: t.clientX,
          startY: t.clientY,
          startTime: Date.now(),
          moved: false,
        };
        const session = { active: false, timer: null as number | null, startX: t.clientX, startY: t.clientY };
        scrub = session;
        session.timer = window.setTimeout(() => {
          if (scrub !== session) {
            return;
          }
          session.active = true;
          session.timer = null;
          const rect = node.getBoundingClientRect();
          argsRef.current.setCursorAtPx(session.startX - rect.left);
        }, SCRUB_HOLD_MS);
      }
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (twoTouch && e.touches.length >= 2) {
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const rect = node.getBoundingClientRect();
        const centerX = (a.clientX + b.clientX) / 2 - rect.left;
        const dist = Math.max(1, touchDistance(a, b));
        const scale = dist / twoTouch.startDist;
        const translationX = centerX - twoTouch.startCenterX;

        const startRange = twoTouch.xMax - twoTouch.xMin;
        const newRange = startRange / Math.max(0.05, scale);
        const pw = Math.max(1, twoTouch.plotWidth);
        const focalPct = Math.max(0, Math.min(1, (twoTouch.startCenterX - twoTouch.padLeft) / pw));
        const xAtFocal = twoTouch.xMin + focalPct * startRange;
        const deltaSec = -(translationX / pw) * newRange;
        const newXMin = xAtFocal - focalPct * newRange + deltaSec;
        argsRef.current.setViewport({ xMin: newXMin, xMax: newXMin + newRange });
        return;
      }
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (scrub && scrub.active) {
          e.preventDefault();
          const rect = node.getBoundingClientRect();
          argsRef.current.setCursorAtPx(t.clientX - rect.left);
          return;
        }
        if (scrub && !scrub.active) {
          const dx = Math.abs(t.clientX - scrub.startX);
          const dy = Math.abs(t.clientY - scrub.startY);
          if (dx > SCRUB_CANCEL_PX || dy > SCRUB_CANCEL_PX) {
            cancelScrubTimer();
            scrub = null;
          }
        }
        if (singleTap) {
          const dx = Math.abs(t.clientX - singleTap.startX);
          const dy = Math.abs(t.clientY - singleTap.startY);
          if (dx > 8 || dy > 8) {
            singleTap.moved = true;
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent): void => {
      if (twoTouch && e.touches.length < 2) {
        twoTouch = null;
        singleTap = null;
        cancelScrubTimer();
        scrub = null;
        return;
      }
      if (scrub && scrub.active && e.touches.length === 0) {
        cancelScrubTimer();
        scrub = null;
        singleTap = null;
        if (!isWebview) {
          setFrozen(true);
        }
        return;
      }
      if (scrub && !scrub.active) {
        cancelScrubTimer();
        scrub = null;
      }
      if (singleTap && e.touches.length === 0) {
        const duration = Date.now() - singleTap.startTime;
        if (!singleTap.moved && duration < 400) {
          const rect = node.getBoundingClientRect();
          const xPx = singleTap.startX - rect.left;
          const now = Date.now();
          if (now - lastTapTime < 300 && Math.abs(singleTap.startX - lastTapX) < 30) {
            argsRef.current.resetViewport();
            setFrozen(false);
            lastTapTime = 0;
          } else {
            if (!isWebview) {
              const idx = argsRef.current.setCursorAtPx(xPx);
              if (idx != null) {
                setFrozen(true);
              }
            }
            lastTapTime = now;
            lastTapX = singleTap.startX;
          }
        }
        singleTap = null;
      }
    };

    const onTouchCancel = (): void => {
      twoTouch = null;
      singleTap = null;
      cancelScrubTimer();
      scrub = null;
    };

    const onDocTouchStart = (e: TouchEvent): void => {
      if (!frozenRef.current) {
        return;
      }
      const target = e.target as Node | null;
      if (target && node.contains(target)) {
        return;
      }
      setFrozen(false);
      argsRef.current.clearCursor();
    };

    node.addEventListener("mousedown", onMouseDown);
    node.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    node.addEventListener("mouseleave", onMouseLeave);
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("dblclick", onDblClick);
    document.addEventListener("mousedown", onDocMouseDown, true);
    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", onTouchCancel);
    document.addEventListener("touchstart", onDocTouchStart, true);
    return () => {
      node.removeEventListener("mousedown", onMouseDown);
      node.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      node.removeEventListener("mouseleave", onMouseLeave);
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("dblclick", onDblClick);
      document.removeEventListener("mousedown", onDocMouseDown, true);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
      document.removeEventListener("touchstart", onDocTouchStart, true);
    };
  }, [node]);

  const Wrap = useCallback(
    function LineChartGestureWrap(props: { children: ReactNode; style: StyleProp<ViewStyle> }): JSX.Element {
      return (
        <View
          ref={setContainerRef}
          style={[
            props.style,
            {
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            } as ViewStyle,
          ]}
        >
          {props.children}
        </View>
      );
    },
    [setContainerRef]
  );

  return { Wrap, frozen, clearFrozen };
}
