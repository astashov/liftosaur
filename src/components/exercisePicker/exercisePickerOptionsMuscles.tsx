import { h, JSX } from "preact";
import { availableMuscles, IMuscle, IScreenMuscle, ISettings } from "../../types";
import { Muscle_getScreenMusclesFromMuscle, Muscle_getMuscleGroupName } from "../../models/muscle";
import { ObjectUtils_keys } from "../../utils/object";
import { StringUtils_dashcase } from "../../utils/string";
import { IFilterValue } from "./exercisePickerOptions";
import { MuscleImage } from "../muscleImage";

interface IProps {
  selectedValues: IMuscle[];
  dontGroup?: boolean;
  settings: ISettings;
  onSelect: (muscle: IMuscle) => void;
}

export function ExercisePickerOptionsMuscles(props: IProps): JSX.Element {
  const selectedValues = props.selectedValues;
  const groupedMuscles = props.dontGroup
    ? {
        muscles: availableMuscles.reduce<Record<string, { label: string; isSelected: boolean }>>((memo, muscle) => {
          memo[muscle] = { label: muscle, isSelected: selectedValues.includes(muscle) };
          return memo;
        }, {}),
      }
    : availableMuscles.reduce(
        (memo, muscle) => {
          const group = Muscle_getScreenMusclesFromMuscle(muscle, props.settings)?.[0];
          if (group != null) {
            memo[group] = memo[group] || {};
            const isSelected = selectedValues.includes(muscle);
            memo[group][muscle] = { label: muscle, isSelected };
          }
          return memo;
        },
        {} as Record<IScreenMuscle | string, Record<IMuscle, IFilterValue>>
      );
  const sortedGroupedMuscles = ObjectUtils_keys(groupedMuscles).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      {sortedGroupedMuscles.map((group) => {
        const muscles = groupedMuscles[group];
        const sortedMuscles = ObjectUtils_keys(muscles).sort(([a], [b]) => a.localeCompare(b));
        return (
          <div className="mb-4">
            <h3 className="mb-2 font-semibold">{Muscle_getMuscleGroupName(group, props.settings)}</h3>
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
                    data-cy={`select-muscle-${StringUtils_dashcase(value.label)}`}
                    className={`bg-background-subtle ${fontSize} flex gap-2 h-12 leading-none overflow-hidden bg-no-repeat items-center rounded-lg border text-left ${value.isSelected ? "border-text-purple text-text-purple" : "border-border-neutral"}`}
                    style={{ borderWidth: value.isSelected ? "2px" : "1px" }}
                    onClick={() => props.onSelect(key)}
                  >
                    <div>
                      <MuscleImage muscle={key} size={61} />
                    </div>
                    <div className="flex-1">{value.label}</div>
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
