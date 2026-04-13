import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  ITargetType,
  IHistoryEntry,
  IStats,
} from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { updateProgress } from "../models/state";
import { lb, LensBuilder } from "lens-shmens";
import { WorkoutExerciseSet, computeSetColumnWidths } from "./workoutExerciseSet";
import { Reps_isFinishedSet, Reps_addSet } from "../models/set";
import { IconPlus2 } from "./icons/iconPlus2";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { WorkoutExerciseUtils_getBgColor100 } from "../utils/workoutExerciseUtils";
import { Equipment_getUnitOrDefaultForExerciseType } from "../models/equipment";
import { IconSwapSmall } from "./icons/iconSwapSmall";
import { ProgressStateChanges } from "./progressStateChanges";
import { IEvaluatedProgram } from "../models/program";
import { Exercise_getIsUnilateral } from "../models/exercise";
import { useMemo } from "react";

interface IWorkoutExerciseAllSets {
  day: number;
  isCurrentProgress: boolean;
  isPlayground: boolean;
  exerciseType: IExerciseType;
  lbWarmupSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  progress: IHistoryRecord;
  entry: IHistoryEntry;
  entryIndex: number;
  lastSets?: ISet[];
  helps?: string[];
  stats: IStats;
  onStopShowingHint?: () => void;
  onTargetClick?: () => void;
  subscription?: ISubscription;
  userPromptedStateVars?: IProgramState;
  program?: IEvaluatedProgram;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  settings: ISettings;
  dispatch: IDispatch;
}

function getTargetColumnLabel(targetType: ITargetType): string {
  switch (targetType) {
    case "target":
      return "Target";
    case "lasttime":
      return "Previous Set";
    case "platescalculator":
      return "Plates";
    case "e1rm":
      return "e1RM";
  }
}

export function WorkoutExerciseAllSets(props: IWorkoutExerciseAllSets): JSX.Element {
  const warmupSets = props.entry.warmupSets;
  const sets = props.entry.sets;
  const buttonBgColor = WorkoutExerciseUtils_getBgColor100(sets, false);
  const nextSetIndex = [...warmupSets, ...sets].findIndex((s) => !Reps_isFinishedSet(s));
  const exerciseUnit =
    sets[0]?.completedWeight?.unit ??
    sets[0]?.weight?.unit ??
    warmupSets[0]?.completedWeight?.unit ??
    warmupSets[0]?.weight?.unit ??
    Equipment_getUnitOrDefaultForExerciseType(props.settings, props.exerciseType);
  const targetLabel = getTargetColumnLabel(props.settings.workoutSettings.targetType);
  const lbEntry = lb<IHistoryRecord>().p("entries").i(props.entryIndex);
  const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
  const remValue = props.settings.textSize ?? 16;
  const columnWidths = useMemo(() => computeSetColumnWidths(remValue, isUnilateral), [remValue, isUnilateral]);

  return (
    <View>
      <View className="flex-row items-center pb-1 border-b border-border-neutral">
        <View className="items-center" style={{ width: columnWidths.set }}>
          <Text className="text-xs text-text-secondary">Set</Text>
        </View>
        <View className="flex-1">
          <Pressable onPress={props.onTargetClick} className="flex-row items-center">
            {targetLabel ? <Text className="mr-1 text-xs text-text-secondary">{targetLabel}</Text> : null}
            {props.onTargetClick && <IconSwapSmall size={12} color={Tailwind_colors().lightgray[600]} />}
          </Pressable>
        </View>
        <View className="items-center" style={{ width: columnWidths.reps }}>
          <Text className="text-xs text-text-secondary">Reps</Text>
        </View>
        <View style={{ width: columnWidths.separator }} />
        <View className="items-center" style={{ width: columnWidths.weight }}>
          <Text className="text-xs text-text-secondary">{exerciseUnit}</Text>
        </View>
        <View style={{ width: columnWidths.check }} />
      </View>

      <View>
        {warmupSets.map((set, i) => (
          <WorkoutExerciseSet
            isCurrentProgress={props.isCurrentProgress}
            isPlayground={props.isPlayground}
            type="warmup"
            key={`warmup-${set.id}-${i}`}
            day={props.day}
            entry={props.entry}
            progress={props.progress}
            exerciseType={props.exerciseType}
            programExercise={props.programExercise}
            otherStates={props.otherStates}
            subscription={props.subscription}
            lbSets={props.lbWarmupSets}
            lbSet={props.lbWarmupSets.i(i)}
            set={set}
            entryIndex={props.entryIndex}
            isNext={nextSetIndex === i}
            setIndex={i}
            columnWidths={columnWidths}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        ))}
        {sets.map((set, i) => (
          <WorkoutExerciseSet
            isPlayground={props.isPlayground}
            isCurrentProgress={props.isCurrentProgress}
            type="workout"
            key={`workout-${set.id}-${i}`}
            onStopShowingHint={props.onStopShowingHint}
            progress={props.progress}
            entry={props.entry}
            helps={props.helps}
            isNext={nextSetIndex - warmupSets.length === i}
            programExercise={props.programExercise}
            day={props.day}
            otherStates={props.otherStates}
            exerciseType={props.exerciseType}
            lastSet={props.lastSets?.[i]}
            subscription={props.subscription}
            lbSets={props.lbSets}
            lbSet={props.lbSets.i(i)}
            set={set}
            entryIndex={props.entryIndex}
            setIndex={i}
            columnWidths={columnWidths}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        ))}
      </View>

      {props.programExercise && props.program && (
        <View className="mx-4 mt-2 mb-1">
          <ProgressStateChanges
            entry={props.entry}
            settings={props.settings}
            dayData={props.programExercise.dayData}
            programExercise={props.programExercise}
            stats={props.stats}
            program={props.program}
            userPromptedStateVars={props.userPromptedStateVars}
            onSuppressProgress={(isSuppressed) => {
              updateProgress(
                props.dispatch,
                lbEntry.recordModify((entry) => ({ ...entry, isSuppressed })),
                "suppress"
              );
            }}
          />
        </View>
      )}

      <View className="flex-row gap-2 px-4 my-2">
        <View className="flex-1">
          <Pressable
            className={`${buttonBgColor} w-full py-2 rounded-md flex-row items-center justify-center`}
            data-cy="add-warmup-set"
            testID="add-warmup-set"
            onPress={() => {
              const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
              updateProgress(
                props.dispatch,
                [props.lbWarmupSets.recordModify((s) => Reps_addSet(s, isUnilateral, undefined, true))],
                "add-warmupset"
              );
            }}
          >
            <IconPlus2 size={10} color={Tailwind_colors().blue[400]} />
            <Text className="ml-2 text-xs font-semibold text-text-link">Add Warmup Set</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <Pressable
            className={`${buttonBgColor} w-full py-2 rounded-md flex-row items-center justify-center`}
            data-cy="add-workout-set"
            testID="add-workout-set"
            onPress={() => {
              const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
              updateProgress(
                props.dispatch,
                [
                  props.lbSets.recordModify((s) =>
                    Reps_addSet(s, isUnilateral, props.lastSets ? props.lastSets[props.lastSets.length - 1] : undefined)
                  ),
                ],
                "add-set"
              );
            }}
          >
            <IconPlus2 size={10} color={Tailwind_colors().blue[400]} />
            <Text className="ml-2 text-xs font-semibold text-text-link">Add Set</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
