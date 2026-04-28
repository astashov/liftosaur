import type { JSX } from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { ExerciseImage } from "../../../components/exerciseImage";
import {
  IExercise,
  Exercise_findByName,
  Exercise_find,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroups,
  Exercise_toExternalUrl,
} from "../../../models/exercise";
import { Weight_rpeMultiplier } from "../../../models/weight";
import { ISettings } from "../../../types";
import {
  PlannerProgramExercise_numberOfSets,
  PlannerProgramExercise_numberOfSetsThisWeek,
  PlannerProgramExercise_sets,
} from "../models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerState } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { PlannerGraph } from "../plannerGraph";
import { LinkButton } from "../../../components/linkButton";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { PlannerKey_fromPlannerExercise } from "../plannerKey";
import { IconExternalLink } from "../../../components/icons/iconExternalLink";
import { ExerciseImageUtils_exists } from "../../../models/exerciseImage";
import { Muscle_getMuscleGroupName } from "../../../models/muscle";
import { useRem } from "../../../utils/useRem";

interface IPlannerExerciseStatsProps {
  settings: ISettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  weekIndex: number;
  dispatch: ILensDispatch<IPlannerState>;
  dayIndex: number;
  exerciseLine: number;
  hideSwap?: boolean;
  onEditMuscleGroupsOverride?: (exerciseType: IExercise) => void;
}

export function getExerciseForStats(
  weekIndex: number,
  dayIndex: number,
  exerciseLine: number,
  evaluatedWeeks: IPlannerEvalResult[][],
  settings: ISettings
): { exercise: IExercise; evaluatedExercise: IPlannerProgramExercise } | undefined {
  const evaluatedWeek = evaluatedWeeks[weekIndex];
  const evaluatedDay = evaluatedWeek[dayIndex];

  if (!evaluatedDay.success) {
    return undefined;
  }

  const evaluatedExercise = evaluatedDay.data.find((e) => e.line === exerciseLine);
  if (!evaluatedExercise) {
    return undefined;
  }

  const customExercises = settings.exercises;
  let exercise = Exercise_findByName(evaluatedExercise.name, customExercises);
  if (!exercise) {
    return undefined;
  }
  exercise = Exercise_find({ id: exercise.id, equipment: evaluatedExercise.equipment }, customExercises);
  if (!exercise) {
    return undefined;
  }
  return { exercise, evaluatedExercise };
}

export function PlannerExerciseStats(props: IPlannerExerciseStatsProps): JSX.Element {
  const result = getExerciseForStats(
    props.weekIndex,
    props.dayIndex,
    props.exerciseLine,
    props.evaluatedWeeks,
    props.settings
  );
  if (!result) {
    return <></>;
  }
  const evaluatedWeek = props.evaluatedWeeks[props.weekIndex];
  const { exercise, evaluatedExercise } = result;

  const targetMuscles = Exercise_targetMuscles(exercise, props.settings);
  const synergeticMuscles = Exercise_synergistMuscles(exercise, props.settings);
  const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, props.settings).map((w) =>
    Muscle_getMuscleGroupName(w, props.settings)
  );
  const synergeticMuscleGroups = Exercise_synergistMusclesGroups(exercise, props.settings)
    .map((w) => Muscle_getMuscleGroupName(w, props.settings))
    .filter((w) => targetMuscleGroups.indexOf(w) === -1);

  const intensityGraphData = getIntensityPerWeeks(props.evaluatedWeeks, props.dayIndex, exercise.name);
  const volumeGraphData = getVolumePerWeeks(props.evaluatedWeeks, props.dayIndex, exercise.name);
  const intensityKey = JSON.stringify(intensityGraphData);
  const volumeKey = JSON.stringify(volumeGraphData);
  const rem = useRem();

  return (
    <View>
      <View className="flex-row gap-4 mb-2">
        <View className="w-12">
          <ExerciseImage exerciseType={exercise} size="small" width={rem * 3} />
        </View>
        <View className="flex-1">
          {ExerciseImageUtils_exists(exercise, "small") ? (
            <Pressable
              className="flex-row items-center mb-2"
              onPress={() => {
                Linking.openURL(Exercise_toExternalUrl(exercise)).catch(() => undefined);
              }}
            >
              <Text className="text-lg font-bold underline text-text-link">{evaluatedExercise.name}</Text>
              <View className="mb-1 ml-1">
                <IconExternalLink size={16} color="#607284" />
              </View>
            </Pressable>
          ) : (
            <Text className="mb-2 text-lg font-bold">{evaluatedExercise.name}</Text>
          )}
          {!props.hideSwap && (
            <View>
              <LinkButton
                name="planner-swap-exercise"
                className="text-xs"
                data-testid="planner-swap-exercise"
                testID="planner-swap-exercise"
                onClick={() => {
                  const exerciseKey = PlannerKey_fromPlannerExercise(evaluatedExercise, props.settings);
                  props.dispatch(
                    [
                      lb<IPlannerState>()
                        .pi("ui")
                        .p("modalExercise")
                        .record({
                          focusedExercise: {
                            weekIndex: 0,
                            dayIndex: 0,
                            exerciseLine: 0,
                          },
                          types: [],
                          muscleGroups: [],
                          exerciseType: exercise,
                          exerciseKey,
                        }),
                      lb<IPlannerState>().pi("ui").p("showExerciseStats").record(undefined),
                    ],
                    "Swap exercise"
                  );
                }}
              >
                Swap Exercise
              </LinkButton>
            </View>
          )}
          <Text className="text-xs">
            <Text className="text-xs text-text-secondary">Sets this day: </Text>
            <Text className="text-xs">{PlannerProgramExercise_numberOfSets(evaluatedExercise)}</Text>
          </Text>
          <Text className="text-xs">
            <Text className="text-xs text-text-secondary">Sets this week: </Text>
            <Text className="text-xs">
              {PlannerProgramExercise_numberOfSetsThisWeek(evaluatedExercise.name, evaluatedWeek)}
            </Text>
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-xs">
        <Text className="text-xs text-text-secondary">Target Muscles: </Text>
        <Text className="text-xs font-bold">{targetMuscles.join(", ")}</Text>
      </Text>
      <Text className="text-xs">
        <Text className="text-xs text-text-secondary">Synergist Muscles: </Text>
        <Text className="text-xs font-bold">{synergeticMuscles.join(", ")}</Text>
      </Text>
      <View>
        <LinkButton
          name="edit-muscle-groups"
          className="text-xs"
          onClick={() => {
            if (props.onEditMuscleGroupsOverride) {
              props.onEditMuscleGroupsOverride(exercise);
            } else {
              props.dispatch(
                [lb<IPlannerState>().pi("ui").p("showMuscleGroupsOverride").record(exercise)],
                "Edit muscle groups"
              );
            }
          }}
        >
          Edit Exercise Muscles
        </LinkButton>
      </View>
      <Text className="mt-1 text-xs">
        <Text className="text-xs text-text-secondary">Target Muscles Groups: </Text>
        <Text className="text-xs font-bold">{targetMuscleGroups.join(", ")}</Text>
      </Text>
      <Text className="text-xs">
        <Text className="text-xs text-text-secondary">Synergist Muscle Groups: </Text>
        <Text className="text-xs font-bold">{synergeticMuscleGroups.join(", ")}</Text>
      </Text>
      <View>
        <LinkButton
          name="edit-muscle-groups"
          className="text-xs"
          onClick={() => {
            props.dispatch([lb<IPlannerState>().pi("ui").p("showEditMuscleGroups").record(true)], "Edit muscle groups");
          }}
        >
          Edit Muscle Groups
        </LinkButton>
      </View>
      {intensityGraphData[0].length > 1 && (
        <View style={{ marginTop: -14 }}>
          <PlannerGraph
            key={intensityKey}
            title="Intensity w/w"
            color="red"
            yAxisLabel="Intensity"
            data={intensityGraphData}
          />
        </View>
      )}
      {volumeGraphData[0].length > 1 && (
        <View style={{ marginTop: -14 }}>
          <PlannerGraph key={volumeKey} title="Volume w/w" color="orange" yAxisLabel="Volume" data={volumeGraphData} />
        </View>
      )}
    </View>
  );
}

function getIntensityPerWeeks(
  evaluatedWeeks: IPlannerEvalResult[][],
  dayIndex: number,
  exerciseName: string
): [number[], number[]] {
  const data: [number[], number[]] = [[], []];
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
    const evaluatedWeek = evaluatedWeeks[weekIndex];
    let exercise: IPlannerProgramExercise | undefined;
    const evaluatedDay = evaluatedWeek[dayIndex] as IPlannerEvalResult | undefined;
    if (evaluatedDay?.success) {
      exercise = evaluatedDay.data.find((e) => e.name === exerciseName);
    }
    if (!exercise) {
      continue;
    }
    const weights = PlannerProgramExercise_sets(exercise).map((s) => {
      const weight = s.percentage
        ? s.percentage * 100
        : Weight_rpeMultiplier(s.repRange?.maxrep ?? 1, s.rpe ?? 10) * 100;
      return Number(weight.toFixed(2));
    });
    data[0].push(weekIndex + 1);
    data[1].push(Math.max(...weights));
  }
  return data;
}

function getVolumePerWeeks(
  evaluatedWeeks: IPlannerEvalResult[][],
  dayIndex: number,
  exerciseName: string
): [number[], number[]] {
  const data: [number[], number[]] = [[], []];
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
    const evaluatedWeek = evaluatedWeeks[weekIndex];
    let exercise: IPlannerProgramExercise | undefined;
    const evaluatedDay = evaluatedWeek[dayIndex] as IPlannerEvalResult | undefined;
    if (evaluatedDay?.success) {
      exercise = evaluatedDay.data.find((e) => e.name === exerciseName);
    }
    if (!exercise) {
      continue;
    }
    const volume = Number(
      PlannerProgramExercise_sets(exercise)
        .reduce((acc, s) => {
          if (!s.repRange) {
            return acc;
          }
          const reps = s.repRange.maxrep ?? 0;
          const weight = s.percentage ? s.percentage * 100 : Weight_rpeMultiplier(reps, s.rpe ?? 10) * 100;
          return acc + s.repRange.numberOfSets * weight * reps;
        }, 0)
        .toFixed(2)
    );
    data[0].push(weekIndex + 1);
    data[1].push(volume);
  }
  return data;
}
