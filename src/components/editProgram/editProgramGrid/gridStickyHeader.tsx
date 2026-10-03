import { JSX, ReactNode, useEffect, useRef } from "react";

export const GridStickyHeader_isCss = true;

// On the web the page scrolls on the compositor thread, so a header moved from a scroll listener is
// always a frame behind. CSS sticky is pinned by the compositor itself. It has to live outside the
// grid's horizontal scroller, whose overflow would otherwise become the sticky ancestor.
export function GridStickyHeader(props: {
  top: number;
  width: number;
  subscribeHorizontalOffset: (listener: (x: number) => void) => () => void;
  onHeightChange: (height: number) => void;
  below?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const { subscribeHorizontalOffset, onHeightChange } = props;

  useEffect(() => {
    return subscribeHorizontalOffset((x) => {
      if (rowRef.current != null) {
        rowRef.current.style.transform = `translateX(${-x}px)`;
      }
    });
  }, [subscribeHorizontalOffset]);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame == null) {
      return undefined;
    }
    onHeightChange(frame.getBoundingClientRect().height);
    const observer = new ResizeObserver(() => onHeightChange(frame.getBoundingClientRect().height));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div style={{ position: "sticky", top: props.top, zIndex: 2 }}>
      <div ref={frameRef} className="overflow-hidden bg-background-default">
        <div ref={rowRef} style={{ width: props.width }}>
          {props.children}
        </div>
      </div>
      {props.below != null && <div style={{ position: "absolute", top: "100%", left: 0, right: 0 }}>{props.below}</div>}
    </div>
  );
}
