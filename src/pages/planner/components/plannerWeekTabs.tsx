import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { IconPlus2 } from "../../../components/icons/iconPlus2";
import { IconArrowRight } from "../../../components/icons/iconArrowRight";
import { HorizontalScroll_edges, IHorizontalScrollEdges } from "../../../utils/horizontalScroll";

export function PlannerWeekTabs(props: {
  weeks: { name: string; isInvalid: boolean }[];
  selectedIndex: number;
  onSelect: (weekIndex: number) => void;
  onAdd: () => void;
}): JSX.Element {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<IHorizontalScrollEdges>({ hasMoreLeft: false, hasMoreRight: false });

  const updateEdges = useCallback(() => {
    const row = rowRef.current;
    if (row == null) {
      return;
    }
    const next = HorizontalScroll_edges(row.scrollLeft, row.scrollWidth, row.clientWidth);
    setEdges((prev) =>
      prev.hasMoreLeft === next.hasMoreLeft && prev.hasMoreRight === next.hasMoreRight ? prev : next
    );
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (row == null) {
      return undefined;
    }
    const observer = new ResizeObserver(updateEdges);
    observer.observe(row);
    return () => observer.disconnect();
  }, [updateEdges]);

  useEffect(() => {
    const row = rowRef.current;
    const tab = row?.querySelector<HTMLElement>(`[data-testid="planner-week-tab-${props.selectedIndex}"]`);
    if (row == null || tab == null) {
      return;
    }
    const left = tab.offsetLeft - row.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < row.scrollLeft) {
      row.scrollLeft = left;
    } else if (right > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = right - row.clientWidth;
    }
    updateEdges();
  }, [props.selectedIndex, props.weeks.length, updateEdges]);

  function scrollByPage(direction: -1 | 1): void {
    const row = rowRef.current;
    row?.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {edges.hasMoreLeft && <ScrollArrow direction="left" onClick={() => scrollByPage(-1)} />}
      {edges.hasMoreRight && <ScrollArrow direction="right" onClick={() => scrollByPage(1)} />}
      <div ref={rowRef} className="flex items-center gap-3 py-1 overflow-x-auto hide-scrollbar" onScroll={updateEdges}>
        {props.weeks.map((week, weekIndex) => {
          const isSelected = weekIndex === props.selectedIndex;
          const borderClass = isSelected
            ? "border-2 border-text-purple text-text-purple"
            : "border border-border-prominent text-text-secondary";
          return (
            <button
              key={weekIndex}
              className={`relative shrink-0 px-5 py-2.5 text-base font-semibold whitespace-nowrap rounded-md bg-background-default nm-planner-week-tab ${borderClass}`}
              data-testid={`planner-week-tab-${weekIndex}`}
              aria-pressed={isSelected}
              onClick={() => props.onSelect(weekIndex)}
            >
              {week.name}
              {week.isInvalid && (
                <span
                  className="absolute w-2 h-2 rounded-full bg-text-error"
                  style={{ top: "0.25rem", right: "0.25rem" }}
                />
              )}
            </button>
          );
        })}
        <button
          className="p-2 shrink-0 nm-planner-add-week"
          data-testid="planner-add-week"
          aria-label="Add week"
          title="Add week"
          onClick={props.onAdd}
        >
          <IconPlus2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ScrollArrow(props: { direction: "left" | "right"; onClick: () => void }): JSX.Element {
  const isLeft = props.direction === "left";
  return (
    <button
      className={`absolute z-10 flex items-center justify-center w-8 h-8 border rounded-full shadow-sm bg-background-default border-border-neutral nm-planner-week-tabs-${props.direction} ${isLeft ? "left-0" : "right-0"}`}
      style={{ top: "50%", transform: `translateY(-50%)${isLeft ? " scaleX(-1)" : ""}` }}
      data-testid={`planner-week-tabs-${props.direction}`}
      aria-label={isLeft ? "Scroll weeks left" : "Scroll weeks right"}
      onClick={props.onClick}
    >
      <IconArrowRight />
    </button>
  );
}
