import { createContext, JSX, ReactNode, RefObject, useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent, Animated, View, LayoutChangeEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";

export interface INavScreenScrollContextValue {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
}

export const NavScreenScrollContext = createContext<INavScreenScrollContextValue | null>(null);

export function NavScreenContent(props: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  footer?: ReactNode;
}): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
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
    },
    [navigation]
  );

  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height);
  }, []);

  const contextValue = useMemo(() => ({ scrollRef, scrollYRef }), []);

  const scrollView = (
    <ScrollView
      ref={scrollRef}
      data-testid="screen"
      testID="screen"
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: props.footer != null ? footerHeight : 0 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      stickyHeaderIndices={props.stickyHeaderIndices}
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
