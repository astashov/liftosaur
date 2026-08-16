import { Children, JSX, ReactNode, useCallback, useState } from "react";
import { Animated, View, LayoutChangeEvent, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";
import { NavScreenScrollContext } from "./NavScreenScrollContext";
import { useNavScreenScroll } from "./useNavScreenScroll";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";
import { useSystemKeyboardHeight } from "../utils/useSystemKeyboardHeight";

export { NavScreenScrollContext } from "./NavScreenScrollContext";
export type { INavScreenScrollListener, INavScreenScrollContextValue } from "./NavScreenScrollContext";

// Android has no automaticallyAdjustKeyboardInsets, and under edge-to-edge the window doesn't
// shrink for the IME either — so without this the content can't be scrolled past the keyboard
// at all, and anything trying to reveal a focused line just hits the end of the scroll range.
// Its own component so opening the keyboard re-renders the spacer, not the whole screen.
function SystemKeyboardSpacer(): JSX.Element {
  const height = useSystemKeyboardHeight();
  return <View style={{ height }} />;
}

export function NavScreenContent(props: {
  children: ReactNode;
  stickyHeaderIndices?: number[];
  footer?: ReactNode;
  // Opt-in per screen rather than global: on-drag dismisses on any scroll, which is wrong
  // for form-ish screens but right where the keyboard covers what you're reading.
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
  // Android only (iOS gets it from automaticallyAdjustKeyboardInsets). Opt-in because it
  // lengthens the scroll content on every screen that turns it on, keyboard up or not.
  avoidSystemKeyboard?: boolean;
}): JSX.Element {
  const navigation = useNavigation();
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const [footerHeight, setFooterHeight] = useState(0);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
  const onScrolledChange = useCallback(
    (isScrolled: boolean) => navigation.setOptions({ navIsScrolled: isScrolled }),
    [navigation]
  );
  const {
    contextValue,
    scrollRef,
    viewportRef,
    onScroll: onAnimatedScroll,
    onLayout: onScrollViewLayout,
    onContentSizeChange,
  } = useNavScreenScroll({ footerHeight, stickyHeaderHeight, onScrolledChange });

  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height);
  }, []);

  const onStickyHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setStickyHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  // Only the last sticky header is measured: RN pushes each pinned one out with the next, so
  // by the time the content below is on screen that one alone covers the top of the scroll
  // area. The wrapper is what gives it a host view to measure — the child may be a Profiler.
  const stickyIndices = props.stickyHeaderIndices;
  const lastStickyIndex =
    stickyIndices != null && stickyIndices.length > 0 ? stickyIndices[stickyIndices.length - 1] : undefined;
  const children =
    lastStickyIndex == null
      ? props.children
      : Children.map(props.children, (child, index) =>
          index === lastStickyIndex ? <View onLayout={onStickyHeaderLayout}>{child}</View> : child
        );

  const scrollMarkers = usePerfScrollMarkers("NavScreenContent");

  const scrollView = (
    <Animated.ScrollView
      ref={scrollRef}
      data-testid="screen"
      testID="screen"
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: props.footer != null ? footerHeight : 0 }}
      automaticallyAdjustKeyboardInsets={true}
      keyboardDismissMode={props.keyboardDismissMode}
      onScroll={onAnimatedScroll}
      onLayout={onScrollViewLayout}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={16}
      onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
      onScrollEndDrag={scrollMarkers.onScrollEndDrag}
      onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      stickyHeaderIndices={props.stickyHeaderIndices}
      removeClippedSubviews={false}
      style={
        Platform.OS === "web"
          ? ({ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" } as object)
          : undefined
      }
    >
      {children}
      <Animated.View style={{ height: animatedKeyboardHeight }} />
      {props.avoidSystemKeyboard === true && Platform.OS === "android" ? <SystemKeyboardSpacer /> : null}
    </Animated.ScrollView>
  );

  return (
    <NavScreenScrollContext.Provider value={contextValue}>
      {props.footer != null ? (
        // Spans exactly the scroll area — the footer below is absolutely positioned inside it.
        <View ref={viewportRef} className="flex-1">
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
