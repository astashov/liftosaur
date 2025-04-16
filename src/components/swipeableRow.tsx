import { JSX } from "preact";
import { useState, useRef } from "preact/hooks";
import { MathUtils } from "../utils/math";

interface ISwipeableRowProps {
  children: (props: {
    onPointerDown: (event: TouchEvent | PointerEvent) => void;
    onPointerMove: (event: TouchEvent | PointerEvent) => void;
    onPointerUp: () => void;
    style: JSX.CSSProperties;
    close: () => void;
  }) => JSX.Element;
  width: number;
  onPointerDown?: () => void;
  openThreshold: number;
  closeThreshold: number;
  initiateTreshold: number;
  scrollThreshold: number;
  showHint?: boolean;
}

export function SwipeableRow(props: ISwipeableRowProps) {
  const { children, width, openThreshold, closeThreshold } = props;
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const isDragging = useRef(false);
  const isScrolling = useRef(false);
  const isSwiping = useRef(false);
  const isOpen = useRef(false);

  const handlePointerDown = (event: TouchEvent | PointerEvent) => {
    if (props.onPointerDown) {
      props.onPointerDown();
    }
    const workoutExerciseScroller = document.querySelector("#workout-exercise-scroller") as HTMLElement | null;
    if (workoutExerciseScroller) {
      workoutExerciseScroller.style.overflowX = "hidden";
    }
    startX.current = "touches" in event ? event.touches[0].clientX : event.clientX;
    startY.current = "touches" in event ? event.touches[0].clientY : event.clientY;
    startScrollTop.current = document.documentElement.scrollTop;
    isDragging.current = true;
    isScrolling.current = false;
    isSwiping.current = false;
  };

  const handlePointerMove = (event: TouchEvent | PointerEvent) => {
    if (isSwiping.current) {
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
      setTranslateX(MathUtils.clamp(deltaX, -width, 0));
      return;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    const workoutExerciseScroller = document.querySelector("#workout-exercise-scroller") as HTMLElement | null;
    if (workoutExerciseScroller) {
      workoutExerciseScroller.style.overflowX = "scroll";
    }

    if (!isOpen.current && translateX < -openThreshold) {
      // If swiped far enough left, keep it open
      setTranslateX(-width);
      isOpen.current = true;
    } else if (isOpen.current && translateX > -closeThreshold) {
      // If swiped back right past close threshold, close it smoothly
      setTranslateX(0);
      isOpen.current = false;
    } else {
      // Otherwise, keep the current state
      setTranslateX(isOpen.current ? -width : 0);
    }
  };

  const close = () => {
    setTranslateX(0);
    isOpen.current = false;
  };

  return children({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    style: {
      animation: props.showHint ? "swipeable-row-hint 3s ease-in-out infinite" : undefined,
      transform: !props.showHint ? `translateX(${translateX}px)` : undefined,
      transition: isDragging.current ? "none" : "transform 0.3s ease-in-out",
    },
    close,
  });
}
