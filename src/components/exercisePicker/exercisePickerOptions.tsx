import { h, JSX } from "preact";
import { ObjectUtils } from "../../utils/object";

interface IProps<T extends string> {
  values: Record<T, IFilterValue>;
  onSelect: (key: T) => void;
}

export type IFilterValue = { label: string; isSelected: boolean; disabledReason?: string };

export function ExercisePickerOptions<T extends string>(props: IProps<T>): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 mt-2">
      {ObjectUtils.entries(props.values).map(([key, value]) => {
        return (
          <div>
            <div>
              <button
                className={`bg-background-subtle h-12 leading-none px-2 w-full ${value.disabledReason ? "text-border-neutral" : "text-text-primary"} rounded-lg border text-center ${value.isSelected ? "border-text-purple text-text-purple" : "border-border-neutral"}`}
                disabled={!!value.disabledReason}
                style={{ borderWidth: value.isSelected ? "2px" : "1px" }}
                onClick={() => {
                  props.onSelect(key);
                }}
              >
                {value.label}
              </button>
            </div>
            {value.disabledReason && <div className="text-xs text-text-secondary">{value.disabledReason}</div>}
          </div>
        );
      })}
    </div>
  );
}
