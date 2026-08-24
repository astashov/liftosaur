import { createContext, useContext } from "react";
import { Animated } from "react-native";

export interface ISheetExpansion {
  isExpanded: boolean;
  // True from the moment the handle is grabbed until the sheet has settled again. While it is,
  // the sheet's height comes from dragOffset rather than from its content — so that's also the
  // window in which what layout reports back is not the sheet's own resting height.
  isDragging: boolean;
  // How much taller than its collapsed self the sheet is right now, 0..expandRange.
  dragOffset: Animated.Value;
  // Held here rather than by the content, which remounts on its own (the liftoeditor sheets
  // remount their body to switch instances) and would lose the measurement mid-expansion.
  collapsedHeight: number;
  setCollapsedHeight: (height: number) => void;
  // The content owns the cap it expands into, so it's the one that says how far the drag goes.
  setExpandRange: (range: number) => void;
}

export const SheetExpansionContext = createContext<ISheetExpansion>({
  isExpanded: false,
  isDragging: false,
  dragOffset: new Animated.Value(0),
  collapsedHeight: 0,
  setCollapsedHeight: () => undefined,
  setExpandRange: () => undefined,
});

export function useSheetExpansion(): ISheetExpansion {
  return useContext(SheetExpansionContext);
}
