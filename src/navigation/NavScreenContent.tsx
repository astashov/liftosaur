import { Children, JSX, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  View,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";
import { INavScreenScrollListener, NavScreenScrollContext } from "./NavScreenScrollContext";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";
import { useSystemKeyboardHeight } from "../utils/useSystemKeyboardHeight";

export { NavScreenScrollContext } from "./NavScreenScrollContext";
export type { INavScreenScrollListener, INavScreenScrollContextValue } from "./NavScreenScrollContext";

// Android has no automaticallyAdjustKeyboardInsets, and under edge-to-edge the window doesn't
// shrink for the IME either — so without this the content can't be scrolled past the keyboard
// at all, and anything trying to reveal a focused line just hits the end of the scroll range.
// Its own component so opening the keyboard re-renders the spacer, not the whole screen.
function SystemKeyboardSpacer(): JSX.Element {
  const height = useSystemKeyboardHeight();
  return <View style={{ height }} />;
}

export function NavScreenContent(props: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  footer?: ReactNode;
  // Opt-in per screen rather than global: on-drag dismisses on any scroll, which is wrong
  // for form-ish screens but right where the keyboard covers what you're reading.
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
  // Android only (iOS gets it from automaticallyAdjustKeyboardInsets). Opt-in because it
  // lengthens the scroll content on every screen that turns it on, keyboard up or not.
  avoidSystemKeyboard?: boolean;
}): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollAnimatedY = useRef(new Animated.Value(0)).current;
  const scrollListenersRef = useRef<Set<INavScreenScrollListener>>(new Set());
  const layoutSizeRef = useRef({ width: 0, height: 0 });
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const [footerHeight, setFooterHeight] = useState(0);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
  const viewportRef = useRef<View>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      layoutSizeRef.current = e.nativeEvent.layoutMeasurement;
      contentSizeRef.current = e.nativeEvent.contentSize;
      const isScrolled = y > 0;
      if (isScrolled !== isScrolledRef.current) {
        isScrolledRef.current = isScrolled;
        navigation.setOptions({ navIsScrolled: isScrolled });
      }
      scrollListenersRef.current.forEach((listener) => listener(e));
    },
    [navigation]
  );

  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height);
  }, []);

  const onStickyHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setStickyHeaderHeight(e.nativeEvent.layout.height);
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

  const onScrollViewLayout = useCallback(
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
  // anything drawn at a scroll-derived position. Those get this value instead, which the
  // native animation driver keeps in lockstep with the scroll itself.
  const onAnimatedScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollAnimatedY } } }], {
        useNativeDriver: Platform.OS !== "web",
        listener: onScroll,
      }),
    [scrollAnimatedY, onScroll]
  );

  // Only the last sticky header is measured: RN pushes each pinned one out with the next, so
  // by the time the content below is on screen that one alone covers the top of the scroll
  // area. The wrapper is what gives it a host view to measure — the child may be a Profiler.
  const stickyIndices = props.stickyHeaderIndices;
  const lastStickyIndex =
    stickyIndices != null && stickyIndices.length > 0 ? stickyIndices[stickyIndices.length - 1] : undefined;
  const children =
    lastStickyIndex == null
      ? props.children
      : Children.map(props.children, (child, index) =>
          index === lastStickyIndex ? <View onLayout={onStickyHeaderLayout}>{child}</View> : child
        );

  const scrollMarkers = usePerfScrollMarkers("NavScreenContent");

  const scrollView = (
    <Animated.ScrollView
      ref={scrollRef}
      data-testid="screen"
      testID="screen"
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: props.footer != null ? footerHeight : 0 }}
      automaticallyAdjustKeyboardInsets={true}
      keyboardDismissMode={props.keyboardDismissMode}
      onScroll={onAnimatedScroll}
      onLayout={onScrollViewLayout}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={16}
      onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
      onScrollEndDrag={scrollMarkers.onScrollEndDrag}
      onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      stickyHeaderIndices={props.stickyHeaderIndices}
      removeClippedSubviews={false}
      style={
        Platform.OS === "web"
          ? ({ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" } as object)
          : undefined
      }
    >
      {children}
      <Animated.View style={{ height: animatedKeyboardHeight }} />
      {props.avoidSystemKeyboard === true && Platform.OS === "android" ? <SystemKeyboardSpacer /> : null}
    </Animated.ScrollView>
  );

  return (
    <NavScreenScrollContext.Provider value={contextValue}>
      {props.footer != null ? (
        // Spans exactly the scroll area — the footer below is absolutely positioned inside it.
        <View ref={viewportRef} className="flex-1">
          {scrollView}
          <View onLayout={onFooterLayout} className="absolute bottom-0 left-0 right-0" pointerEvents="box-none">
            {props.footer}
          </View>
        </View>
      ) : (
        scrollView
      )}
    </NavScreenScrollContext.Provider>
  );
}
