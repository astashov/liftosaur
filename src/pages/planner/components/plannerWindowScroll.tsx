import { JSX, ReactNode, useEffect, useMemo, useRef } from "react";
import { Animated, NativeScrollEvent } from "react-native";
import {
  INavScreenScrollContextValue,
  INavScreenScrollListener,
  INavScrollTarget,
  INavViewport,
  NavScreenScrollContext,
} from "../../../navigation/NavScreenScrollContext";

function windowScrollEvent(): { nativeEvent: NativeScrollEvent } {
  const doc = document.documentElement;
  return {
    nativeEvent: {
      contentOffset: { x: window.scrollX, y: window.scrollY },
      contentSize: { width: doc.scrollWidth, height: doc.scrollHeight },
      layoutMeasurement: { width: window.innerWidth, height: window.innerHeight },
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      zoomScale: 1,
    },
  };
}

const windowScrollTarget: INavScrollTarget = {
  scrollTo: (y, x, animated) => {
    const options = typeof y === "object" ? y : { y, x, animated };
    window.scrollTo({
      top: options?.y ?? window.scrollY,
      left: options?.x ?? window.scrollX,
      behavior: options?.animated === false ? "auto" : "smooth",
    });
  },
};

const windowViewport: INavViewport = {
  measureInWindow: (callback) => callback(0, 0, window.innerWidth, window.innerHeight),
};

export function PlannerWindowScrollProvider(props: {
  stickyHeaderHeight: number;
  footerHeight: number;
  children: ReactNode;
}): JSX.Element {
  const scrollRef = useRef<INavScrollTarget | null>(windowScrollTarget);
  const viewportRef = useRef<INavViewport | null>(windowViewport);
  const scrollYRef = useRef(0);
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const scrollAnimatedY = useRef(new Animated.Value(0)).current;
  const listenersRef = useRef(new Set<INavScreenScrollListener>());

  useEffect(() => {
    function onScroll(): void {
      const event = windowScrollEvent();
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      contentSizeRef.current = event.nativeEvent.contentSize;
      scrollAnimatedY.setValue(scrollYRef.current);
      listenersRef.current.forEach((listener) => listener(event));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollAnimatedY]);

  const value = useMemo<INavScreenScrollContextValue>(
    () => ({
      scrollRef,
      scrollYRef,
      contentSizeRef,
      scrollAnimatedY,
      viewportRef,
      footerHeight: props.footerHeight,
      stickyHeaderHeight: props.stickyHeaderHeight,
      addScrollListener: (listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
    }),
    [scrollAnimatedY, props.footerHeight, props.stickyHeaderHeight]
  );

  return <NavScreenScrollContext.Provider value={value}>{props.children}</NavScreenScrollContext.Provider>;
}
