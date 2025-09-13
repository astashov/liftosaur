import { h, JSX } from "preact";
import { availableMuscles, IMuscle, IScreenMuscle } from "../../types";
import { Muscle } from "../../models/muscle";
import { ObjectUtils } from "../../utils/object";
import { StringUtils } from "../../utils/string";
import { IFilterValue } from "./exercisePickerOptions";

interface IProps {
  selectedValues: IMuscle[];
  onSelect: (muscle: IMuscle) => void;
}

export function ExercisePickerOptionsMuscles(props: IProps): JSX.Element {
  const selectedValues = props.selectedValues;
  const groupedMuscles = availableMuscles.reduce(
    (memo, muscle) => {
      const group = Muscle.getScreenMusclesFromMuscle(muscle)?.[0];
      if (group != null) {
        memo[group] = memo[group] || {};
        const isSelected = selectedValues.includes(muscle);
        memo[group][muscle] = { label: muscle, isSelected };
      }
      return memo;
    },
    {} as Record<IScreenMuscle, Record<IMuscle, IFilterValue>>
  );
  const sortedGroupedMuscles = ObjectUtils.keys(groupedMuscles).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      {sortedGroupedMuscles.map((group) => {
        const muscles = groupedMuscles[group];
        const sortedMuscles = ObjectUtils.keys(muscles).sort(([a], [b]) => a.localeCompare(b));
        return (
          <div className="mb-4">
            <h3 className="mb-2 font-semibold">{StringUtils.capitalize(group)}</h3>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {sortedMuscles.map((key) => {
                const value = muscles[key];
                const words = value.label.split(" ");
                const wordCount = words.length;
                const longestWord = Math.max(...words.map((w) => w.length));
                const fontSize =
                  wordCount > 3 || longestWord > 11
                    ? "text-xs"
                    : wordCount > 2 || longestWord > 9
                      ? "text-sm"
                      : "text-base";
                return (
                  <button
                    className={`bg-background-subtle ${fontSize} h-12 leading-none overflow-hidden bg-no-repeat flex items-center rounded-lg border text-left ${value.isSelected ? "border-text-purple text-text-purple" : "border-border-neutral"}`}
                    style={{
                      paddingLeft: "70px",
                      borderWidth: value.isSelected ? "2px" : "1px",
                      backgroundImage: `url(/images/svgs/muscles/${key.toLowerCase().replace(/ /g, "")}.svg)`,
                      backgroundSize: "contain",
                      backgroundPosition: "0 50%",
                    }}
                    onClick={() => {
                      props.onSelect(key);
                    }}
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
