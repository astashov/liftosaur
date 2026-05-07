import { Children, JSX, ReactNode, useEffect, useRef } from "react";

interface IWorkoutExercisePagerProps {
  currentEntryIndex: number;
  entryCount: number;
  windowWidth: number;
  pageHeight?: number;
  forceUpdateEntryIndex: boolean;
  onIndexChange: (next: number) => void;
  children: ReactNode;
}

export function WorkoutExercisePager(props: IWorkoutExercisePagerProps): JSX.Element {
  const { currentEntryIndex, windowWidth, forceUpdateEntryIndex, onIndexChange } = props;
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: currentEntryIndex * windowWidth, behavior: "instant" as ScrollBehavior });
  }, [forceUpdateEntryIndex, windowWidth]);

  return (
    <div
      ref={scrollerRef}
      className="parent-scroller"
      onScroll={() => {
        const scrollLeft = scrollerRef.current?.scrollLeft ?? 0;
        if (windowWidth <= 0) {
          return;
        }
        const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
        if (selectedIndex !== currentEntryIndex) {
          onIndexChange(selectedIndex);
        }
      }}
      style={{
        display: "flex",
        overflowX: "scroll",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollSnapType: "x mandatory",
      }}
    >
      {Children.map(props.children, (child, index) => (
        <div
          key={index}
          style={{
            minWidth: "100vw",
            scrollSnapAlign: "center",
            scrollSnapStop: "always",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
