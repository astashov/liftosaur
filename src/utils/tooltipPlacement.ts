export interface ITooltipRect {
  left: number;
  top: number;
  bottom: number;
}

export interface ITooltipSize {
  width: number;
  height: number;
}

const GAP = 4;
const MARGIN = 8;

export function TooltipPlacement_place(
  anchor: ITooltipRect,
  tooltip: ITooltipSize,
  viewport: ITooltipSize
): { left: number; top: number } {
  const left = Math.max(MARGIN, Math.min(anchor.left, viewport.width - tooltip.width - MARGIN));
  const below = anchor.bottom + GAP;
  const fitsBelow = below + tooltip.height <= viewport.height - MARGIN;
  const top = fitsBelow ? below : Math.max(MARGIN, anchor.top - tooltip.height - GAP);
  return { left, top };
}
