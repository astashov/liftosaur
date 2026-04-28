import { createContext, JSX, ReactNode, RefObject, useCallback, useMemo, useRef } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";

export interface INavScreenScrollContextValue {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
}

export const NavScreenScrollContext = createContext<INavScreenScrollContextValue | null>(null);

export function NavScreenContent(props: { children: ReactNode; stickyHeaderIndices?: number[] }): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();

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

  const contextValue = useMemo(() => ({ scrollRef, scrollYRef }), []);

  return (
    <NavScreenScrollContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollRef}
        data-cy="screen" data-testid="screen"
        testID="screen"
        className="bg-background-default"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={props.stickyHeaderIndices}
      >
        {props.children}
        <Animated.View style={{ height: animatedKeyboardHeight }} />
      </ScrollView>
    </NavScreenScrollContext.Provider>
  );
}
