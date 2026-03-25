import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  ITargetType,
  IHistoryEntry,
  IStats,
} from "@shared/types";
import type { IPlannerProgramExercise } from "@shared/pages/planner/models/types";
import type { IByExercise } from "@shared/pages/planner/plannerEvaluator";
import type { IEvaluatedProgram } from "@shared/models/program";
import { updateProgress } from "@shared/models/state";
import { lb, LensBuilder } from "lens-shmens";
import { WorkoutExerciseSet } from "./WorkoutExerciseSet";
import { Reps_isFinishedSet, Reps_addSet } from "@shared/models/set";
import { IconPlus2 } from "./icons/IconPlus2";
import { Tailwind_colors } from "@shared/utils/tailwindConfig";
import { WorkoutExerciseUtils_getBgColor100 } from "@shared/utils/workoutExerciseUtils";
import { Equipment_getUnitOrDefaultForExerciseType } from "@shared/models/equipment";
import { IconSwapSmall } from "./icons/IconSwapSmall";
import { Exercise_getIsUnilateral } from "@shared/models/exercise";
import { ProgressStateChanges } from "./ProgressStateChanges";

interface IProps {
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
  stats: IStats;
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

export function WorkoutExerciseAllSets(props: IProps): JSX.Element {
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

  return (
    <View>
      <View className="flex-row items-center border-b border-border-neutral" style={{ minHeight: 28 }}>
        <View className="items-center" style={{ width: 40 }}>
          <Text className="text-xs text-text-secondary">Set</Text>
        </View>
        <Pressable className="flex-1" onPress={props.onTargetClick}>
          <View className="flex-row items-center">
            <Text className="mr-1 text-xs text-text-secondary">{targetLabel}</Text>
            {props.onTargetClick && <IconSwapSmall size={12} color={Tailwind_colors().lightgray[600]} />}
          </View>
        </Pressable>
        <View className="items-center" style={{ width: 60 }}>
          <Text className="text-xs text-text-secondary">Reps</Text>
        </View>
        <View style={{ width: 20 }} />
        <View className="items-center" style={{ width: 80 }}>
          <Text className="text-xs text-text-secondary">{exerciseUnit}</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>
      {warmupSets.map((set, i) => (
        <WorkoutExerciseSet
          key={`warmup-${set.id}-${i}`}
          isCurrentProgress={props.isCurrentProgress}
          isPlayground={props.isPlayground}
          type="warmup"
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
          settings={props.settings}
          dispatch={props.dispatch}
        />
      ))}
      {sets.map((set, i) => (
        <WorkoutExerciseSet
          key={`workout-${set.id}-${i}`}
          isPlayground={props.isPlayground}
          isCurrentProgress={props.isCurrentProgress}
          type="workout"
          progress={props.progress}
          entry={props.entry}
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
          settings={props.settings}
          dispatch={props.dispatch}
        />
      ))}
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
              const lbEntry = lb<IHistoryRecord>().p("entries").i(props.entryIndex);
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
        <Pressable
          className={`flex-1 ${buttonBgColor} py-2 rounded-md flex-row items-center justify-center`}
          data-cy="add-warmup-set"
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
        <Pressable
          className={`flex-1 ${buttonBgColor} py-2 rounded-md flex-row items-center justify-center`}
          data-cy="add-workout-set"
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
  );
}
