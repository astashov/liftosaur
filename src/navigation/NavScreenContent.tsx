import { JSX, ReactNode, Ref, RefObject, createContext, useContext, useRef } from "react";
import { ScrollView } from "react-native";

const NavScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useNavScrollRef(): RefObject<HTMLDivElement | null> | null {
  return useContext(NavScrollContext);
}

export function NavScreenContent(props: { children: ReactNode; scrollRef?: Ref<HTMLDivElement> }): JSX.Element {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const setRef = (node: HTMLDivElement | null) => {
    fallbackRef.current = node;
    if (typeof props.scrollRef === "function") {
      props.scrollRef(node);
    } else if (props.scrollRef && "current" in props.scrollRef) {
      (props.scrollRef as { current: HTMLDivElement | null }).current = node;
    }
  };
  return (
    <NavScrollContext.Provider value={fallbackRef}>
      <ScrollView
        ref={setRef as unknown as Ref<ScrollView>}
        data-cy="screen"
        testID="screen"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
      >
        {props.children}
      </ScrollView>
    </NavScrollContext.Provider>
  );
}
