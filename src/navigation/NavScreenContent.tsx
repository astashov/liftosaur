import { JSX, ReactNode, useCallback, useMemo, useRef, useState } from "react";
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

export { NavScreenScrollContext } from "./NavScreenScrollContext";
export type { INavScreenScrollListener, INavScreenScrollContextValue } from "./NavScreenScrollContext";

export function NavScreenContent(props: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  footer?: ReactNode;
}): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollListenersRef = useRef<Set<INavScreenScrollListener>>(new Set());
  const layoutSizeRef = useRef({ width: 0, height: 0 });
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const [footerHeight, setFooterHeight] = useState(0);

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

  const contextValue = useMemo(() => ({ scrollRef, scrollYRef, addScrollListener }), [addScrollListener]);

  const scrollMarkers = usePerfScrollMarkers("NavScreenContent");

  const scrollView = (
    <ScrollView
      ref={scrollRef}
      data-testid="screen"
      testID="screen"
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: props.footer != null ? footerHeight : 0 }}
      automaticallyAdjustKeyboardInsets={true}
      onScroll={onScroll}
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
      {props.children}
      <Animated.View style={{ height: animatedKeyboardHeight }} />
    </ScrollView>
  );

  return (
    <NavScreenScrollContext.Provider value={contextValue}>
      {props.footer != null ? (
        <View className="flex-1">
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
