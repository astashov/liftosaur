export interface IHorizontalScrollWheel {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  offset: number;
  maxOffset: number;
  viewportWidth: number;
}

export interface IHorizontalScrollEdges {
  hasMoreLeft: boolean;
  hasMoreRight: boolean;
}

const LINE_HEIGHT_PX = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

export function HorizontalScroll_wheelDelta(w: IHorizontalScrollWheel): number | undefined {
  if (w.maxOffset <= 0 || Math.abs(w.deltaX) >= Math.abs(w.deltaY)) {
    return undefined;
  }
  const scale = w.deltaMode === DOM_DELTA_LINE ? LINE_HEIGHT_PX : w.deltaMode === DOM_DELTA_PAGE ? w.viewportWidth : 1;
  const delta = w.deltaY * scale;
  const isAtEnd = delta > 0 ? w.offset >= w.maxOffset - 1 : w.offset <= 1;
  return isAtEnd ? undefined : delta;
}

export function HorizontalScroll_edges(
  offset: number,
  contentWidth: number,
  viewportWidth: number
): IHorizontalScrollEdges {
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  return { hasMoreLeft: offset > 1, hasMoreRight: offset < maxOffset - 1 };
}

export function HorizontalScroll_fadeMask(edges: IHorizontalScrollEdges, fadePx: number): string | undefined {
  if (!edges.hasMoreLeft && !edges.hasMoreRight) {
    return undefined;
  }
  const left = edges.hasMoreLeft ? `transparent 0, black ${fadePx}px` : "black 0";
  const right = edges.hasMoreRight ? `black calc(100% - ${fadePx}px), transparent 100%` : "black 100%";
  return `linear-gradient(to right, ${left}, ${right})`;
}
