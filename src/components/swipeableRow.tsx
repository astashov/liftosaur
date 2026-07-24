import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { MathUtils_clamp } from "../utils/math";

interface ISwipeableRowProps {
  children: (props: {
    style: React.CSSProperties;
    close: () => void;
    moveRef: React.RefObject<HTMLDivElement | null>;
  }) => JSX.Element;
  width: number;
  onPointerDown?: () => void;
  openThreshold: number;
  closeThreshold: number;
  initiateTreshold: number;
  scrollThreshold: number;
  showHint?: boolean;
}

export function SwipeableRow(props: ISwipeableRowProps): JSX.Element {
  const { children, width, openThreshold, closeThreshold } = props;
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const isDragging = useRef(false);
  const isScrolling = useRef(false);
  const isSwiping = useRef(false);
  const isOpen = useRef(false);
  const translateXRef = useRef(0);
  const moveRef = useRef<HTMLDivElement | null>(null);
  const onPointerDownProp = props.onPointerDown;

  const updateTranslate = useCallback((value: number): void => {
    translateXRef.current = value;
    setTranslateX(value);
  }, []);

  const handlePointerDown = useCallback(
    (event: TouchEvent | PointerEvent): void => {
      if (isDragging.current) {
        return;
      }
      if (onPointerDownProp) {
        onPointerDownProp();
      }
      const parentScroller = document.querySelectorAll(".parent-scroller");
      for (const scroller of Array.from(parentScroller)) {
        (scroller as HTMLElement).style.overflowX = "hidden";
      }
      startX.current = "touches" in event ? event.touches[0].clientX : event.clientX;
      startY.current = "touches" in event ? event.touches[0].clientY : event.clientY;
      startScrollTop.current = document.documentElement.scrollTop;
      isDragging.current = true;
      isScrolling.current = false;
      isSwiping.current = false;
    },
    [onPointerDownProp]
  );

  const handlePointerMove = useCallback(
    (event: TouchEvent | PointerEvent): void => {
      if (isSwiping.current && event.cancelable) {
        event.preventDefault();
      }
      if (!isDragging.current) {
        return;
      }
      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
      const deltaX = clientX - startX.current - (isOpen.current ? width : 0);
      const deltaY = Math.abs(clientY - startY.current);

      if (deltaY > props.scrollThreshold && !isSwiping.current) {
        isScrolling.current = true;
      }

      if (deltaX < -props.initiateTreshold && !isScrolling.current) {
        isSwiping.current = true;
        updateTranslate(MathUtils_clamp(deltaX, -width, 0));
        return;
      }
    },
    [width, props.scrollThreshold, props.initiateTreshold, updateTranslate]
  );

  const handlePointerUp = useCallback((): void => {
    if (!isDragging.current) {
      return;
    }
    isDragging.current = false;
    const parentScroller = document.querySelectorAll(".parent-scroller");
    for (const scroller of Array.from(parentScroller)) {
      (scroller as HTMLElement).style.overflowX = "scroll";
    }

    const current = translateXRef.current;
    if (!isOpen.current && current < -openThreshold) {
      updateTranslate(-width);
      isOpen.current = true;
    } else if (isOpen.current && current > -closeThreshold) {
      updateTranslate(0);
      isOpen.current = false;
    } else {
      updateTranslate(isOpen.current ? -width : 0);
    }
  }, [openThreshold, closeThreshold, width, updateTranslate]);

  useEffect(() => {
    const el = moveRef.current;
    if (!el) {
      return;
    }
    el.addEventListener("touchstart", handlePointerDown, { passive: true });
    el.addEventListener("touchend", handlePointerUp, { passive: true });
    el.addEventListener("touchcancel", handlePointerUp, { passive: true });
    el.addEventListener("touchmove", handlePointerMove, { passive: false });
    el.addEventListener("pointerdown", handlePointerDown, { passive: true });
    el.addEventListener("pointerup", handlePointerUp, { passive: true });
    el.addEventListener("pointercancel", handlePointerUp, { passive: true });
    el.addEventListener("pointermove", handlePointerMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", handlePointerDown);
      el.removeEventListener("touchend", handlePointerUp);
      el.removeEventListener("touchcancel", handlePointerUp);
      el.removeEventListener("touchmove", handlePointerMove);
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerUp);
      el.removeEventListener("pointermove", handlePointerMove);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  const close = (): void => {
    updateTranslate(0);
    isOpen.current = false;
  };

  return children({
    style: {
      animation: props.showHint ? "swipeable-row-hint 3s ease-in-out infinite" : undefined,
      transform: !props.showHint ? `translateX(${translateX}px)` : undefined,
      transition: isDragging.current ? "none" : "transform 0.3s ease-in-out",
    },
    close,
    moveRef,
  });
}
