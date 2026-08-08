import { createContext, RefObject } from "react";
import type { Animated, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";

export type INavScreenScrollListener = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

export interface INavScreenScrollContextValue {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
  // The same offset, fed by the native animation driver rather than by JS. Anything whose
  // position is derived from the scroll has to interpolate this one — the ref and the
  // listeners lag by a frame or two, which shows up as the content drifting on fast scrolls.
  scrollAnimatedY: Animated.Value;
  // The scroll area itself, for measuring where it ends on screen. Set only on screens with
  // a footer, which are the only ones where anything overlaps the scroll content. Measure it
  // rather than deriving a bottom from window height: on Android edge-to-edge the window and
  // measureInWindow don't share an origin, so the two can't be mixed in one calculation.
  viewportRef: RefObject<View | null>;
  // Height of the screen's footer slot (0 when there is none) — what docked chrome occludes.
  // State, not a ref, so anything positioning against it re-runs when the footer resizes.
  footerHeight: number;
  // How much of the scroll area's top edge the pinned sticky header covers, for content that
  // wants to position itself against the actually-visible top rather than the viewport's.
  stickyHeaderHeight: number;
  addScrollListener: (listener: INavScreenScrollListener) => () => void;
}

export const NavScreenScrollContext = createContext<INavScreenScrollContextValue | null>(null);
