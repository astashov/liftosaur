import { JSX, ReactNode, useRef } from "react";
import { View, ScrollView, Platform } from "react-native";

interface IProps {
  children: ReactNode;
  arrowYOffsetPct?: number;
  scrollOffset?: number;
}

export function Scroller(props: IProps): JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const isWeb = Platform.OS === "web";

  if (!isWeb) {
    return (
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        {props.children}
      </ScrollView>
    );
  }

  return (
    <View className="relative flex-1 min-w-0">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="scrollbar-hide"
      >
        {props.children}
      </ScrollView>
    </View>
  );
}
