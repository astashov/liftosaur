import { JSX, ReactNode, useCallback } from "react";
import { ScrollViewProps, View } from "react-native";

export const GRID_SCALE_MIN = 0.45;
export const GRID_SCALE_MAX = 2.2;

export interface IGridPinchArgs {
  scale: number;
  onScalePreview: (scale: number) => void;
  onScaleCommit: (scale: number) => void;
}

export interface IGridPinchResult {
  Wrap: (props: { children: ReactNode }) => JSX.Element;
  scrollAnimatedProps?: Partial<ScrollViewProps>;
  // Whether there is a pinch to tell the user about. Answered here rather than by a `Platform`
  // check at the hint, so the two platforms' answer stays in the two files that implement it.
  canPinch: boolean;
}

// Web has no pinch surface to speak of - the density presets are the control there. Gesture handler
// is also known to eat scrolling inside the mobile webview, so it stays off this path entirely.
export function useGridPinch(_args: IGridPinchArgs): IGridPinchResult {
  const Wrap = useCallback((props: { children: ReactNode }): JSX.Element => <View>{props.children}</View>, []);
  return { Wrap, canPinch: false };
}
