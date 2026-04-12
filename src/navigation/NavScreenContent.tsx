import { JSX, ReactNode, Ref, RefObject, createContext, useCallback, useContext, useRef } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";

const NavScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useNavScrollRef(): RefObject<HTMLDivElement | null> | null {
  return useContext(NavScrollContext);
}

export function NavScreenContent(props: { children: ReactNode; scrollRef?: Ref<HTMLDivElement> }): JSX.Element {
  const navigation = useNavigation();
  const fallbackRef = useRef<HTMLDivElement>(null);
  const isScrolledRef = useRef(false);

  const setRef = (node: HTMLDivElement | null) => {
    fallbackRef.current = node;
    if (typeof props.scrollRef === "function") {
      props.scrollRef(node);
    } else if (props.scrollRef && "current" in props.scrollRef) {
      (props.scrollRef as { current: HTMLDivElement | null }).current = node;
    }
  };

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
    <NavScrollContext.Provider value={fallbackRef}>
      <ScrollView
        ref={setRef as unknown as Ref<ScrollView>}
        data-cy="screen"
        testID="screen"
        className="bg-background-default"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {props.children}
      </ScrollView>
    </NavScrollContext.Provider>
  );
}
