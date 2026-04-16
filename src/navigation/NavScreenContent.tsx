import { createContext, JSX, ReactNode, RefObject, useCallback, useRef } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";

export const NavScreenScrollContext = createContext<RefObject<ScrollView | null> | null>(null);

export function NavScreenContent(props: { children: ReactNode; stickyHeaderIndices?: number[] }): JSX.Element {
  const navigation = useNavigation();
  const isScrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const isScrolled = e.nativeEvent.contentOffset.y > 0;
      if (isScrolled !== isScrolledRef.current) {
        isScrolledRef.current = isScrolled;
        navigation.setOptions({ navIsScrolled: isScrolled });
      }
    },
    [navigation]
  );

  return (
    <NavScreenScrollContext.Provider value={scrollRef}>
      <ScrollView
        ref={scrollRef}
        data-cy="screen"
        testID="screen"
        className="bg-background-default"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={props.stickyHeaderIndices}
      >
        {props.children}
      </ScrollView>
    </NavScreenScrollContext.Provider>
  );
}
