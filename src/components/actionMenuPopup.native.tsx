import { JSX, ReactNode } from "react";

export interface IActionMenuAnchor {
  top: number;
  right: number;
}

export function ActionMenuPopup_anchor(_event: unknown): IActionMenuAnchor | undefined {
  return undefined;
}

export function ActionMenuPopup(_props: {
  anchor: IActionMenuAnchor;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element | null {
  return null;
}
