import { JSX, ReactNode, Ref, forwardRef, useImperativeHandle, useRef } from "react";
import { View, ScrollView, Platform } from "react-native";

interface IProps {
  children: ReactNode;
  arrowYOffsetPct?: number;
  scrollOffset?: number;
}

export interface IScrollerHandle {
  scrollToEnd: () => void;
  scrollTo: (x: number) => void;
}

export const Scroller = forwardRef(function Scroller(props: IProps, ref: Ref<IScrollerHandle>): JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const isWeb = Platform.OS === "web";

  useImperativeHandle(
    ref,
    () => ({
      scrollToEnd: () => scrollRef.current?.scrollToEnd({ animated: true }),
      scrollTo: (x: number) => scrollRef.current?.scrollTo({ x, animated: true }),
    }),
    []
  );

  if (!isWeb) {
    return (
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        {props.children}
      </ScrollView>
    );
  }

  return (
    <View className="relative flex-1 min-w-0">
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} className="scrollbar-hide">
        {props.children}
      </ScrollView>
    </View>
  );
});
