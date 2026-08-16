import { RefObject, useCallback, useMemo, useRef } from "react";
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { INavScreenScrollContextValue, INavScreenScrollListener } from "./NavScreenScrollContext";

export interface INavScreenScrollOptions {
  footerHeight: number;
  stickyHeaderHeight: number;
  // Fired only when the answer flips, so a screen can react to "is scrolled at all" without
  // re-rendering on every frame of a scroll.
  onScrolledChange?: (isScrolled: boolean) => void;
}

export interface INavScreenScroll {
  contextValue: INavScreenScrollContextValue;
  scrollRef: RefObject<ScrollView | null>;
  // Spans exactly the scroll area, for measuring where it ends on screen.
  viewportRef: RefObject<View | null>;
  // The native-driven Animated.event; the JS listener rides along inside it.
  onScroll: ReturnType<typeof Animated.event>;
  onLayout: (e: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
}

// Everything a scroll area has to publish for the content inside it to position against:
// the offset (both as a ref and as a native-driven Animated.Value), the viewport to measure,
// and a listener registry. Extracted from NavScreenContent so surfaces that aren't screens —
// a bottom sheet with its own scroller — can provide the same context rather than leaving it
// null, which is what silently disables caret reveal and drag auto-scroll inside a modal.
export function useNavScreenScroll(options: INavScreenScrollOptions): INavScreenScroll {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const scrollAnimatedY = useRef(new Animated.Value(0)).current;
  const scrollListenersRef = useRef<Set<INavScreenScrollListener>>(new Set());
  const layoutSizeRef = useRef({ width: 0, height: 0 });
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const isScrolledRef = useRef(false);
  const onScrolledChangeRef = useRef(options.onScrolledChange);
  onScrolledChangeRef.current = options.onScrolledChange;

  const onScrollEvent = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollYRef.current = y;
    layoutSizeRef.current = e.nativeEvent.layoutMeasurement;
    contentSizeRef.current = e.nativeEvent.contentSize;
    const isScrolled = y > 0;
    if (isScrolled !== isScrolledRef.current) {
      isScrolledRef.current = isScrolled;
      onScrolledChangeRef.current?.(isScrolled);
    }
    scrollListenersRef.current.forEach((listener) => listener(e));
  }, []);

  // Listeners (e.g. useProgressiveItems) only ever see fresh onScroll events. When a screen isn't
  // tall enough to scroll, no such event fires, so a listener that gates work on a near-bottom scroll
  // would never advance. Replay the current scroll state on layout/content-size changes and on
  // registration so those listeners can detect "already at the bottom / not scrollable".
  const notifyListeners = useCallback((listeners: INavScreenScrollListener[]) => {
    const layout = layoutSizeRef.current;
    const content = contentSizeRef.current;
    if (layout.height <= 0 || content.height <= 0) {
      return;
    }
    const syntheticEvent = {
      nativeEvent: {
        contentOffset: { x: 0, y: scrollYRef.current },
        contentSize: content,
        layoutMeasurement: layout,
      },
    } as NativeSyntheticEvent<NativeScrollEvent>;
    listeners.forEach((listener) => listener(syntheticEvent));
  }, []);

  const onContentSizeChange = useCallback(
    (width: number, height: number) => {
      contentSizeRef.current = { width, height };
      notifyListeners([...scrollListenersRef.current]);
    },
    [notifyListeners]
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      layoutSizeRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      notifyListeners([...scrollListenersRef.current]);
    },
    [notifyListeners]
  );

  const addScrollListener = useCallback(
    (listener: INavScreenScrollListener) => {
      scrollListenersRef.current.add(listener);
      notifyListeners([listener]);
      return () => {
        scrollListenersRef.current.delete(listener);
      };
    },
    [notifyListeners]
  );

  const { footerHeight, stickyHeaderHeight } = options;
  const contextValue = useMemo(
    () => ({
      scrollRef,
      scrollYRef,
      scrollAnimatedY,
      viewportRef,
      footerHeight,
      stickyHeaderHeight,
      addScrollListener,
    }),
    [scrollAnimatedY, footerHeight, stickyHeaderHeight, addScrollListener]
  );

  // The JS listeners above always trail the scroll by a frame or two, which is invisible for
  // anything that only reacts to where the scroll ended up, but reads as rubber-banding for
  // anything drawn at a scroll-derived position. Those get scrollAnimatedY instead, which the
  // native animation driver keeps in lockstep with the scroll itself.
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollAnimatedY } } }], {
        useNativeDriver: Platform.OS !== "web",
        listener: onScrollEvent,
      }),
    [scrollAnimatedY, onScrollEvent]
  );

  return { contextValue, scrollRef, viewportRef, onScroll, onLayout, onContentSizeChange };
}
