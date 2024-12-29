import React, { JSX } from "react";
import { useEffect, useRef, useState } from "react";

interface IProps {
  children: React.ReactNode;
  arrowYOffsetPct?: number;
}

export function Scroller(props: IProps): JSX.Element {
  const [atLeft, setAtLeft] = useState<boolean>(true);
  const [atRight, setAtRight] = useState<boolean>(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tabsRef.current || tabsRef.current!.clientWidth >= tabsRef.current!.scrollWidth) {
      setAtLeft(true);
      setAtRight(true);
    } else {
      setAtLeft(tabsRef.current!.scrollLeft === 0);
      const diff = Math.abs(
        tabsRef.current!.scrollLeft - (tabsRef.current!.scrollWidth - tabsRef.current!.clientWidth)
      );
      setAtRight(diff < 3);
    }
  }, []);

  return (
    <div className="relative flex-1 min-w-0">
      {!atLeft && (
        <button
          className="absolute left-0 z-20 flex items-center justify-center w-8 h-8 px-4 ml-auto bg-white rounded-full outline-none focus:outline-none nm-scroller-left"
          style={{
            boxShadow: "0 0 1px 2px rgba(0,0,0,0.05)",
            top: "50%",
            transform: `translateY(${-50 + (props.arrowYOffsetPct || 0)}%)`,
          }}
          onClick={() => {
            // eslint-disable-next-line no-unused-expressions
            tabsRef.current!.scrollTo({ left: 0, behavior: "smooth" });
          }}
        >
          {"<"}
        </button>
      )}
      {!atRight && (
        <button
          className="absolute right-0 z-20 flex items-center justify-center w-8 h-8 px-4 ml-auto bg-white rounded-full outline-none focus:outline-none nm-scroller-right"
          style={{
            boxShadow: "0 0 1px 2px rgba(0,0,0,0.05)",
            top: "50%",
            transform: `translateY(${-50 + (props.arrowYOffsetPct || 0)}%)`,
          }}
          onClick={() => {
            const newScrollRight = tabsRef.current!.scrollLeft + tabsRef.current!.clientWidth;
            if (newScrollRight !== undefined) {
              // eslint-disable-next-line no-unused-expressions
              tabsRef.current!.scrollTo({ left: newScrollRight, behavior: "smooth" });
            }
          }}
        >
          {">"}
        </button>
      )}

      <div
        className="overflow-x-auto"
        ref={tabsRef}
        onScroll={() => {
          setAtLeft(tabsRef.current!.scrollLeft === 0);
          const diff = Math.abs(
            tabsRef.current!.scrollLeft - (tabsRef.current!.scrollWidth - tabsRef.current!.clientWidth)
          );
          setAtRight(diff < 3);
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
