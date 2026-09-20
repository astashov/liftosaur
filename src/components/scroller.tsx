import { JSX, ReactNode, Ref, RefObject, forwardRef, useImperativeHandle, useRef } from "react";
import { View, ScrollView, Platform, ScrollViewProps } from "react-native";

interface IProps {
  children: ReactNode;
  arrowYOffsetPct?: number;
  scrollOffset?: number;
  scrollViewRef?: RefObject<ScrollView | null>;
  viewportRef?: RefObject<View | null>;
  onScroll?: ScrollViewProps["onScroll"];
  onContentSizeChange?: ScrollViewProps["onContentSizeChange"];
  onLayout?: ScrollViewProps["onLayout"];
}

export interface IScrollerHandle {
  scrollToEnd: () => void;
  scrollTo: (x: number) => void;
}

export const Scroller = forwardRef(function Scroller(props: IProps, ref: Ref<IScrollerHandle>): JSX.Element {
  const ownScrollRef = useRef<ScrollView>(null);
  const scrollRef = props.scrollViewRef ?? ownScrollRef;
  const isWeb = Platform.OS === "web";
  const scrollProps = {
    onScroll: props.onScroll,
    onContentSizeChange: props.onContentSizeChange,
    onLayout: props.onLayout,
    scrollEventThrottle: props.onScroll ? 16 : undefined,
  };

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
      <View ref={props.viewportRef} collapsable={false}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={false}
          {...scrollProps}
        >
          {props.children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View ref={props.viewportRef} className="relative flex-1 min-w-0">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="scrollbar-hide"
        {...scrollProps}
      >
        {props.children}
      </ScrollView>
    </View>
  );
});
