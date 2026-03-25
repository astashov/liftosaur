import type { JSX } from "react";
import { View, Text } from "react-native";
import { Exercise_fromKey, Exercise_get } from "@shared/models/exercise";
import { Weight_display, Weight_build, Weight_getOneRepMax } from "@shared/models/weight";
import { History_getNumberOfPersonalRecords } from "@shared/models/history";
import type { ISettings, ISet, IHistoryRecord } from "@shared/types";
import { ObjectUtils_keys } from "@shared/utils/object";
import { StringUtils_pluralize } from "@shared/utils/string";
import type { IPersonalRecords } from "@shared/models/history";
import { Reps_avgUnilateralCompletedReps } from "@shared/models/set";

interface IProps {
  historyRecords: IHistoryRecord[];
  prs: IPersonalRecords;
  settings: ISettings;
}

interface IPersonalRecordItems {
  maxWeight: Partial<Record<string, { set: ISet; prev?: ISet }[]>>;
  max1RM: Partial<Record<string, { set: ISet; prev?: ISet }[]>>;
}

export function PersonalRecords(props: IProps): JSX.Element {
  if (History_getNumberOfPersonalRecords(props.historyRecords, props.prs) === 0) {
    return (
      <View className="px-4 pt-8 pb-4">
        <Text className="text-center">No new personal records this time</Text>
      </View>
    );
  }

  const items = props.historyRecords.reduce<IPersonalRecordItems>(
    (memo, hr) => {
      const prs = props.prs[hr.id];
      if (!prs) {
        return memo;
      }
      for (const key of ObjectUtils_keys(prs)) {
        const maxWeight = prs[key]?.maxWeightSet;
        if (maxWeight) {
          memo.maxWeight[key] = memo.maxWeight[key] || [];
          memo.maxWeight[key]!.push({ set: maxWeight, prev: prs[key]?.prevMaxWeightSet });
        }
        const max1RM = prs[key]?.max1RMSet;
        if (max1RM) {
          memo.max1RM[key] = memo.max1RM[key] || [];
          memo.max1RM[key]!.push({ set: max1RM, prev: prs[key]?.prevMax1RMSet });
        }
      }
      return memo;
    },
    { maxWeight: {}, max1RM: {} }
  );

  return (
    <View>
      <Text className="pb-1 font-bold text-yellow-600">{"\ud83c\udfc6"} Personal Records</Text>
      {ObjectUtils_keys(items.maxWeight).length > 0 && (
        <View>
          <Text className="my-1 text-xs text-text-secondary">Max Weight</Text>
          <View className="pb-2">
            {ObjectUtils_keys(items.maxWeight).map((exerciseKey) => {
              const exerciseType = Exercise_fromKey(exerciseKey);
              const exercise = Exercise_get(exerciseType, props.settings.exercises);
              return (items.maxWeight[exerciseKey] || []).map((item, i) => (
                <View key={`${exerciseKey}-${i}`}>
                  <Text>
                    <Text className="font-bold">{exercise.name}</Text>
                    {": "}
                    <Text className="font-bold text-text-success">
                      {Weight_display(
                        item.set.completedWeight ?? item.set.weight ?? Weight_build(0, props.settings.units)
                      )}
                    </Text>
                    {`, ${item.set.completedReps || 0} ${StringUtils_pluralize("rep", item.set.completedReps || 0)}`}
                  </Text>
                  {item.prev != null && (
                    <Text className="text-xs italic text-text-secondarysubtle">
                      {"(was "}
                      {item.prev.completedReps || 0}
                      {" \u00d7 "}
                      {Weight_display(
                        item.prev.completedWeight ?? item.prev.weight ?? Weight_build(0, props.settings.units)
                      )}
                      {")"}
                    </Text>
                  )}
                </View>
              ));
            })}
          </View>
        </View>
      )}
      {ObjectUtils_keys(items.max1RM).length > 0 && (
        <View>
          <Text className="my-1 text-xs text-text-secondary">Max Estimated One Rep Max</Text>
          <View className="pb-2">
            {ObjectUtils_keys(items.max1RM).map((exerciseKey) => {
              const exerciseType = Exercise_fromKey(exerciseKey);
              const exercise = Exercise_get(exerciseType, props.settings.exercises);
              return (items.max1RM[exerciseKey] || []).map((item, i) => {
                const estimated1RM = Weight_getOneRepMax(
                  item.set.completedWeight ?? item.set.weight ?? Weight_build(0, props.settings.units),
                  Reps_avgUnilateralCompletedReps(item.set) || 0,
                  item.set.completedRpe ?? item.set.rpe
                );
                const previous1RM = item.prev
                  ? Weight_getOneRepMax(
                      item.prev.completedWeight ?? item.prev.weight ?? Weight_build(0, props.settings.units),
                      Reps_avgUnilateralCompletedReps(item.prev) || 0,
                      item.prev.completedRpe ?? item.prev.rpe
                    )
                  : undefined;
                const setRpe = item.set.completedRpe ?? item.set.rpe;
                const prevRpe = item.prev?.completedRpe ?? item.prev?.rpe;
                return (
                  <View key={`${exerciseKey}-${i}`}>
                    <Text>
                      <Text className="font-bold">{exercise.name}</Text>
                      {": "}
                      <Text className="font-bold text-text-success">{Weight_display(estimated1RM)}</Text>
                      {` (${Reps_avgUnilateralCompletedReps(item.set) || 0} \u00d7 `}
                      {Weight_display(
                        item.set.completedWeight ?? item.set.weight ?? Weight_build(0, props.settings.units)
                      )}
                      {setRpe ? ` @${setRpe}` : ""}
                      {")"}
                    </Text>
                    {item.prev != null && previous1RM && (
                      <Text className="text-xs italic text-text-secondarysubtle">
                        {"(was "}
                        <Text className="font-bold">{Weight_display(previous1RM)}</Text>
                        {`, ${Reps_avgUnilateralCompletedReps(item.prev) || 0} \u00d7 `}
                        {Weight_display(
                          item.prev.completedWeight ?? item.prev.weight ?? Weight_build(0, props.settings.units)
                        )}
                        {prevRpe ? ` @${prevRpe}` : ""}
                        {")"}
                      </Text>
                    )}
                  </View>
                );
              });
            })}
          </View>
        </View>
      )}
    </View>
  );
}
