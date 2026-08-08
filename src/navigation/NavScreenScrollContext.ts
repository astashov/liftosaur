import { createContext, RefObject } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

export type INavScreenScrollListener = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

export interface INavScreenScrollContextValue {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
  // Height of the screen's footer slot (0 when there is none) — what docked chrome occludes.
  // State, not a ref, so anything positioning against it re-runs when the footer resizes.
  footerHeight: number;
  addScrollListener: (listener: INavScreenScrollListener) => () => void;
}

export const NavScreenScrollContext = createContext<INavScreenScrollContextValue | null>(null);
