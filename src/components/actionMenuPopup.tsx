import { JSX, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export interface IActionMenuAnchor {
  top: number;
  right: number;
}

const ANCHOR_GAP = 4;

export function ActionMenuPopup_anchor(event: unknown): IActionMenuAnchor | undefined {
  const target = (event as { currentTarget?: unknown } | undefined)?.currentTarget;
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return undefined;
  }
  const rect = target.getBoundingClientRect();
  return { top: rect.bottom + ANCHOR_GAP, right: rect.right };
}

export function ActionMenuPopup(props: {
  anchor: IActionMenuAnchor;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element {
  const { onClose } = props;
  useEffect(() => {
    window.addEventListener("scroll", onClose, true);
    return () => window.removeEventListener("scroll", onClose, true);
  }, [onClose]);
  return createPortal(
    <div style={{ position: "fixed", top: props.anchor.top, left: props.anchor.right, width: 0, zIndex: 1000 }}>
      {props.children}
    </div>,
    document.body
  );
}
