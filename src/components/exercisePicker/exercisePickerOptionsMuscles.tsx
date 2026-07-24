import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
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
    <>
      {sortedGroupedMuscles.map((group) => {
        const muscles = groupedMuscles[group];
        const sortedMuscles = ObjectUtils_keys(muscles).sort(([a], [b]) => a.localeCompare(b));
        return (
          <View key={group} className="mb-4">
            {!props.dontGroup && (
              <Text className="mb-2 font-semibold">{Muscle_getMuscleGroupName(group, props.settings)}</Text>
            )}
            <View className="flex-row flex-wrap mt-2">
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
                  <View key={key} style={{ width: "50%" }} className="p-1">
                    <Pressable
                      testID={`select-muscle-${StringUtils_dashcase(value.label)}`}
                      data-testid={`select-muscle-${StringUtils_dashcase(value.label)}`}
                      className={`bg-background-subtle flex-row items-center min-h-14 rounded-lg border ${value.isSelected ? "border-text-purple" : "border-border-neutral"}`}
                      style={{ borderWidth: value.isSelected ? 2 : 1 }}
                      onPress={() => props.onSelect(key)}
                    >
                      <View>
                        <MuscleImage muscle={key} size={48} />
                      </View>
                      <Text className={`flex-1 pr-2 ${fontSize} ${value.isSelected ? "text-text-purple" : ""}`}>
                        {value.label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </>
  );
}
