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
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const [footerHeight, setFooterHeight] = useState(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
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

  const addScrollListener = useCallback((listener: INavScreenScrollListener) => {
    scrollListenersRef.current.add(listener);
    return () => {
      scrollListenersRef.current.delete(listener);
    };
  }, []);

  const contextValue = useMemo(() => ({ scrollRef, scrollYRef, addScrollListener }), [addScrollListener]);

  const scrollMarkers = usePerfScrollMarkers("NavScreenContent");

  const scrollView = (
    <ScrollView
      ref={scrollRef}
      data-testid="screen"
      testID="screen"
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: props.footer != null ? footerHeight : 0 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
      onScrollEndDrag={scrollMarkers.onScrollEndDrag}
      onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      stickyHeaderIndices={props.stickyHeaderIndices}
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
