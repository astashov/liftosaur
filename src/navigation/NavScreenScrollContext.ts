import { createContext, RefObject } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

export type INavScreenScrollListener = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

export interface INavScreenScrollContextValue {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
  addScrollListener: (listener: INavScreenScrollListener) => () => void;
}

export const NavScreenScrollContext = createContext<INavScreenScrollContextValue | null>(null);
