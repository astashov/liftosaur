import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import {
  Exercise_fromKey,
  Exercise_toKey,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_get,
} from "../../models/exercise";
import { IPoints, Muscle_getScreenMusclesFromMuscle } from "../../models/muscle";
import { IScreenMuscle, ISettings } from "../../types";
import { CollectionUtils_sort, CollectionUtils_flat } from "../../utils/collection";
import { ObjectUtils_keys } from "../../utils/object";
import { StringUtils_capitalize } from "../../utils/string";
import { GroupHeader } from "../groupHeader";
import { Tabs2 } from "../tabs2";
import { BackMusclesSvg, IMuscleStyle } from "./images/backMusclesSvg";
import { FrontMusclesSvg } from "./images/frontMusclesSvg";
import { MenuItem } from "../menuItem";

export interface IMusclesViewProps {
  title: string;
  points: IPoints;
  settings: ISettings;
  hideListOfExercises?: boolean;
}

export function MusclesView(props: IMusclesViewProps): JSX.Element {
  return (
    <Tabs2
      tabs={[
        [
          "Strength",
          <MusclesTypeView
            type="strength"
            points={props.points}
            settings={props.settings}
            hideListOfExercises={props.hideListOfExercises}
          />,
        ],
        [
          "Hypertrophy",
          <MusclesTypeView
            type="hypertrophy"
            points={props.points}
            settings={props.settings}
            hideListOfExercises={props.hideListOfExercises}
          />,
        ],
      ]}
    />
  );
}

interface IMusclesTypeViewProps {
  type: "strength" | "hypertrophy";
  points: IPoints;
  settings: ISettings;
  hideListOfExercises?: boolean;
}

export function MusclesTypeView(props: IMusclesTypeViewProps): JSX.Element {
  const type = props.type;
  const muscleData = ObjectUtils_keys(props.points.screenMusclePoints[type]).reduce<
    Partial<Record<IScreenMuscle, IMuscleStyle>>
  >((memo, key) => {
    const value = props.points.screenMusclePoints[type][key];
    memo[key] = { opacity: value, fill: "#28839F" };
    return memo;
  }, {});
  const exercises = ObjectUtils_keys(props.points.exercisePoints[type]).map((k) => Exercise_fromKey(k));
  return (
    <View>
      <View className="flex-row p-4">
        <View className="relative flex-1">
          <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
        </View>
        <View className="relative flex-1">
          <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
        </View>
      </View>
      <View className="px-4">
        <GroupHeader name="Muscles used, relatively to each other" />
        {CollectionUtils_sort(
          ObjectUtils_keys(muscleData),
          (a, b) => (muscleData[b]?.opacity || 0) - (muscleData[a]?.opacity || 0)
        )
          .filter((m) => m)
          .map((muscleName) => {
            const value = muscleName ? (muscleData[muscleName]?.opacity ?? 0) * 100 : undefined;
            let color = "text-text-secondary";
            if (value != null && value > 60) {
              color = "text-greenv2-600";
            } else if (value != null && value < 20) {
              color = "text-text-error";
            }
            return (
              <MenuItem
                key={muscleName}
                name={StringUtils_capitalize(muscleName)}
                value={<Text className={color}>{(value || 0).toFixed(0)}%</Text>}
              />
            );
          })}
        {!props.hideListOfExercises && (
          <View>
            <GroupHeader name={`List Of Exercises (${type})`} topPadding={true} />
            <View className="py-4">
              {exercises
                .filter((e) => props.points.exercisePoints[type][Exercise_toKey(e)] != null)
                .map((e) => {
                  const exerciseKey = Exercise_toKey(e);
                  const targetScreenMuscles = Array.from(
                    new Set(
                      CollectionUtils_flat(
                        Exercise_targetMuscles(e, props.settings).map((t) =>
                          Muscle_getScreenMusclesFromMuscle(t, props.settings)
                        )
                      )
                    )
                  );
                  const synergistScreenMuscles = Array.from(
                    new Set(
                      CollectionUtils_flat(
                        Exercise_synergistMuscles(e, props.settings).map((t) =>
                          Muscle_getScreenMusclesFromMuscle(t, props.settings)
                        )
                      )
                    )
                  );
                  const targetScreenMusclesWithPercentage: [string, number][] = targetScreenMuscles.map((m) => [
                    StringUtils_capitalize(m),
                    (props.points.exercisePoints[type][Exercise_toKey(e)]?.[m] || 0) * 100,
                  ]);
                  targetScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                  const synergistScreenMusclesWithPercentage: [string, number][] = synergistScreenMuscles.map((m) => [
                    StringUtils_capitalize(m),
                    (props.points.exercisePoints[type][Exercise_toKey(e)]?.[m] || 0) * 100,
                  ]);
                  synergistScreenMusclesWithPercentage.sort((a, b) => b[1] - a[1]);
                  return (
                    <View key={exerciseKey} className="pb-2">
                      <Text className="text-base font-bold">{Exercise_get(e, props.settings.exercises).name}</Text>
                      <View className="flex-row">
                        <View data-cy="target-muscles-list" data-testid="target-muscles-list" testID="target-muscles-list" className="flex-1">
                          <Text className="text-sm text-text-secondary">Target</Text>
                          {targetScreenMusclesWithPercentage.map(([m, val]) => (
                            <Text key={m}>
                              {m}: {val.toFixed(1)}%
                            </Text>
                          ))}
                        </View>
                        <View data-cy="synergist-muscles-list" data-testid="synergist-muscles-list" testID="synergist-muscles-list" className="flex-1">
                          <Text className="text-sm text-text-secondary">Synergist</Text>
                          {synergistScreenMusclesWithPercentage.map(([m, val]) => (
                            <Text key={m}>
                              {m}: {val.toFixed(1)}%
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
