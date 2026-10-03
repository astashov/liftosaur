import { JSX } from "react";
import { IconPlus2 } from "../../../components/icons/iconPlus2";

export function PlannerWeekTabs(props: {
  weeks: { name: string; isInvalid: boolean }[];
  selectedIndex: number;
  onSelect: (weekIndex: number) => void;
  onAdd: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {props.weeks.map((week, weekIndex) => {
        const isSelected = weekIndex === props.selectedIndex;
        const borderClass = isSelected ? "border-2 border-text-purple text-text-purple" : "border border-border-prominent text-text-secondary";
        return (
          <button
            key={weekIndex}
            className={`relative px-5 py-2.5 text-base font-semibold rounded-md bg-background-default nm-planner-week-tab ${borderClass}`}
            data-testid={`planner-week-tab-${weekIndex}`}
            aria-pressed={isSelected}
            onClick={() => props.onSelect(weekIndex)}
          >
            {week.name}
            {week.isInvalid && (
              <span className="absolute w-2 h-2 rounded-full bg-text-error" style={{ top: "0.25rem", right: "0.25rem" }} />
            )}
          </button>
        );
      })}
      <button
        className="p-2 nm-planner-add-week"
        data-testid="planner-add-week"
        aria-label="Add week"
        title="Add week"
        onClick={props.onAdd}
      >
        <IconPlus2 size={18} />
      </button>
    </div>
  );
}
