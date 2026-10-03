import { JSX, ReactNode } from "react";

export const GridStickyHeader_isCss = false;

export function GridStickyHeader(_props: {
  top: number;
  width: number;
  subscribeHorizontalOffset: (listener: (x: number) => void) => () => void;
  onHeightChange: (height: number) => void;
  below?: ReactNode;
  children: ReactNode;
}): JSX.Element | null {
  return null;
}
