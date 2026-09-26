import { JSX, ReactNode, Ref, RefObject, forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { View, ScrollView, Platform, ScrollViewProps } from "react-native";
import { HorizontalScroll_edges, HorizontalScroll_fadeMask, HorizontalScroll_wheelDelta } from "../utils/horizontalScroll";

const EDGE_FADE_PX = 24;

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

  const scrollableNode = useCallback((): HTMLElement | undefined => {
    const node: unknown = scrollRef.current?.getScrollableNode();
    return typeof HTMLElement !== "undefined" && node instanceof HTMLElement ? node : undefined;
  }, [scrollRef]);

  const updateFade = useCallback(() => {
    const node = scrollableNode();
    if (node == null) {
      return;
    }
    const edges = HorizontalScroll_edges(node.scrollLeft, node.scrollWidth, node.clientWidth);
    const mask = HorizontalScroll_fadeMask(edges, EDGE_FADE_PX) ?? "";
    node.style.maskImage = mask;
    node.style.webkitMaskImage = mask;
  }, [scrollableNode]);

  useEffect(() => {
    const node = isWeb ? scrollableNode() : undefined;
    if (node == null) {
      return;
    }
    const onWheel = (e: WheelEvent): void => {
      const delta = HorizontalScroll_wheelDelta({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        offset: node.scrollLeft,
        maxOffset: node.scrollWidth - node.clientWidth,
        viewportWidth: node.clientWidth,
      });
      if (delta != null) {
        e.preventDefault();
        node.scrollLeft += delta;
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    updateFade();
    return () => node.removeEventListener("wheel", onWheel);
  }, [isWeb, scrollableNode, updateFade]);

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
        scrollEventThrottle={16}
        onScroll={(e) => {
          props.onScroll?.(e);
          updateFade();
        }}
        onContentSizeChange={(width, height) => {
          props.onContentSizeChange?.(width, height);
          updateFade();
        }}
        onLayout={(e) => {
          props.onLayout?.(e);
          updateFade();
        }}
      >
        {props.children}
      </ScrollView>
    </View>
  );
});
