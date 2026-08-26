import { JSX, useState } from "react";
import { View, Pressable, LayoutChangeEvent } from "react-native";
import { useRemScale } from "../../utils/useRem";
import { FitText_fontSize } from "../../utils/fitText";
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

const MUSCLE_IMAGE_SIZE = 48;
// p-1 on the cell, the border, and the label's own pr-2.
const MUSCLE_CELL_CHROME = 24;

export function ExercisePickerOptionsMuscles(props: IProps): JSX.Element {
  const selectedValues = props.selectedValues;
  const remScale = useRemScale();
  const [rowWidth, setRowWidth] = useState(0);
  const onRowLayout = (event: LayoutChangeEvent): void => setRowWidth(event.nativeEvent.layout.width);
  const labelWidth = rowWidth > 0 ? rowWidth / 2 - MUSCLE_IMAGE_SIZE - MUSCLE_CELL_CHROME : 0;
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
            <View className="flex-row flex-wrap mt-2" onLayout={onRowLayout}>
              {sortedMuscles.map((key) => {
                const value = muscles[key];
                // A label wraps between words but never inside one, so the longest word is what has
                // to fit - shrink to that and let wrapping handle the rest.
                const longestWord = value.label
                  .split(" ")
                  .reduce((memo, word) => (word.length > memo.length ? word : memo), "");
                const fontSize = FitText_fontSize(longestWord, labelWidth, 16 * remScale);
                return (
                  <View key={key} style={{ width: "50%" }} className="p-1">
                    <Pressable
                      testID={`select-muscle-${StringUtils_dashcase(value.label)}`}
                      data-testid={`select-muscle-${StringUtils_dashcase(value.label)}`}
                      className={`bg-background-subtle flex-row items-center min-h-scaled-14 rounded-lg border ${value.isSelected ? "border-text-purple" : "border-border-neutral"}`}
                      style={{ borderWidth: value.isSelected ? 2 : 1 }}
                      onPress={() => props.onSelect(key)}
                    >
                      <View>
                        <MuscleImage muscle={key} size={MUSCLE_IMAGE_SIZE} />
                      </View>
                      <Text
                        numberOfLines={2}
                        style={{ fontSize }}
                        className={`flex-1 pr-2 text-base ${value.isSelected ? "text-text-purple" : ""}`}
                      >
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
