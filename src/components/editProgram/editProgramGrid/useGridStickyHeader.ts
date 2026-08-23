import { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, View } from "react-native";
import { NavScreenScrollContext } from "../../../navigation/NavScreenScrollContext";

// The week names are the only thing saying which column is which, and a program several screens
// tall spends most of its scroll with them out of sight. RN has no position:sticky, and the
// screen's ScrollView pins only its own direct children — this row is nested inside the grid's
// horizontal scroller, which is what keeps it lined up with the columns — so it follows the
// vertical offset by hand, the same way StickyError does in dayLiftoEditorInline.tsx.
export function useGridStickyHeader(): {
  containerRef: RefObject<View | null>;
  onContainerLayout: () => void;
  onHeaderLayout: (e: LayoutChangeEvent) => void;
  translateY: Animated.AnimatedInterpolation<number> | number;
} {
  const scrollCtx = useContext(NavScreenScrollContext);
  const containerRef = useRef<View | null>(null);
  const headerHeightRef = useRef(0);
  const stickyHeaderHeight = scrollCtx?.stickyHeaderHeight ?? 0;
  // Where the grid starts in scroll-content coordinates, and how far the header may travel before
  // it would outrun the last row.
  const [anchor, setAnchor] = useState({ top: 0, range: 0 });

  // Both boxes in window coordinates, turned into a content offset with the scroll position that
  // was live at the same moment — on Android edge-to-edge the window and measureInWindow don't
  // share an origin, so nothing here may come from window height or insets.
  const remeasure = useCallback(() => {
    const viewport = scrollCtx?.viewportRef.current;
    const container = containerRef.current;
    if (viewport == null || container == null) {
      return;
    }
    viewport.measureInWindow((_vx, vy) => {
      container.measureInWindow((_x, y, _w, height) => {
        const top = y - vy + (scrollCtx?.scrollYRef.current ?? 0);
        const range = Math.max(0, height - headerHeightRef.current);
        setAnchor((prev) => (prev.top === top && prev.range === range ? prev : { top, range }));
      });
    });
  }, [scrollCtx]);

  // The grid's own onLayout covers its rows growing and shrinking, but not an ancestor resizing
  // above it — collapsing the program header leaves the grid where it was relative to its parent.
  // A changed content height is the one signal that catches both.
  const contentHeightRef = useRef(0);
  useEffect(() => {
    return scrollCtx?.addScrollListener((e) => {
      const contentHeight = e.nativeEvent.contentSize.height;
      if (contentHeight !== contentHeightRef.current) {
        contentHeightRef.current = contentHeight;
        remeasure();
      }
    });
  }, [scrollCtx, remeasure]);

  const onHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      headerHeightRef.current = e.nativeEvent.layout.height;
      remeasure();
    },
    [remeasure]
  );

  // Interpolated rather than followed in JS: the scroll listeners run a frame or two behind the
  // scroll itself, which the eye reads as the row drifting away from the top edge on every flick.
  const scrollAnimatedY = scrollCtx?.scrollAnimatedY;
  const translateY = useMemo(() => {
    const pinnedAt = anchor.top - stickyHeaderHeight;
    if (scrollAnimatedY == null || anchor.range <= 0) {
      return 0;
    }
    return scrollAnimatedY.interpolate({
      inputRange: [pinnedAt, pinnedAt + anchor.range],
      outputRange: [0, anchor.range],
      extrapolate: "clamp",
    });
  }, [scrollAnimatedY, anchor, stickyHeaderHeight]);

  return { containerRef, onContainerLayout: remeasure, onHeaderLayout, translateY };
}
