import { JSX, memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { ExerciseImage } from "../exerciseImage";
import { SimpleMarkdown } from "../simpleMarkdown";
import {
  equipmentName,
  Exercise_get,
  Exercise_getNotes,
  Exercise_nameWithEquipment,
  Exercise_fullName,
} from "../../models/exercise";
import { IHistoryEntry, IHistoryRecord, IProgramState, ISettings, IStats } from "../../types";
import { ComparerUtils_noFns } from "../../utils/comparer";
import { IDispatch } from "../../ducks/types";
import { Reps_isFinished, Reps_isCompleted } from "../../models/set";
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { IconEditSquare } from "../icons/iconEditSquare";
import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program_getDayData } from "../../models/program";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { StringUtils_dashcase } from "../../utils/string";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { PlannerProgramExercise_currentDescription } from "../../pages/planner/models/plannerProgramExercise";
import { WorkoutExerciseAllSets } from "../workoutExerciseAllSets";
import { WorkoutExerciseUtils_getBgColor50 } from "../../utils/workoutExerciseUtils";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { Equipment_getEquipmentNameForExerciseType } from "../../models/equipment";
import { GroupHeader } from "../groupHeader";
import { Progress_getNextSupersetEntry } from "../../models/progress";

interface IProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  stats: IStats;
  settings: ISettings;
  progress: IHistoryRecord;
  dayIndex: number;
  isPlayground: boolean;
  index: number;
  staticState?: IProgramState;
  dispatch: IDispatch;
}

function getColor(entry: IHistoryEntry): string {
  if (entry.sets.length === 0) {
    return "purple";
  }
  if (Reps_isFinished(entry.sets)) {
    if (Reps_isCompleted(entry.sets)) {
      return "green";
    } else {
      return "red";
    }
  } else {
    return "purple";
  }
}

function getBgColor100(entry: IHistoryEntry): string {
  const color = getColor(entry);
  if (color === "green") {
    return "bg-greenv2-100";
  } else if (color === "red") {
    return "bg-redv2-100";
  } else {
    return "bg-background-cardpurple";
  }
}

export const ProgramPreviewPlaygroundExercise = memo((props: IProps): JSX.Element => {
  return props.isPlayground ? (
    <ProgramPreviewPlayground
      stats={props.stats}
      entry={props.entry}
      programExercise={props.programExercise}
      program={props.program}
      settings={props.settings}
      progress={props.progress}
      dayIndex={props.dayIndex}
      index={props.index}
      staticState={props.staticState}
      dispatch={props.dispatch}
    />
  ) : (
    <ProgramPreviewHistoryRecordSets
      entry={props.entry}
      programExercise={props.programExercise}
      settings={props.settings}
      index={props.index}
      dispatch={props.dispatch}
    />
  );
}, ComparerUtils_noFns);

interface IProgramPreviewHistoryRecordSetsProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  settings: ISettings;
  index: number;
  dispatch: IDispatch;
}

function ProgramPreviewHistoryRecordSets(props: IProgramPreviewHistoryRecordSetsProps): JSX.Element {
  const exercise = Exercise_get(props.entry.exercise, props.settings.exercises);
  const equipment = exercise.equipment;
  const programExercise = props.programExercise;
  const description = PlannerProgramExercise_currentDescription(programExercise);

  return (
    <View
      className={`py-2 px-2 mx-4 mb-3 rounded-lg ${getBgColor100(props.entry)} relative`}
      data-cy={StringUtils_dashcase(exercise.name)}
      testID={StringUtils_dashcase(exercise.name)}
    >
      <View className="flex-row items-center gap-2">
        <PlaygroundExerciseTopBar
          dispatch={props.dispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          isPlayground={false}
        />
        <View style={{ width: 40 }}>
          <View className="p-1 rounded-lg bg-background-image">
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
          </View>
        </View>
        <View className="flex-1 ml-auto" style={{ minWidth: 64 }}>
          <View className="flex-row items-center">
            <Text className="flex-1 mr-1 text-sm font-bold">{exercise.name}</Text>
          </View>
          {equipment && <Text className="text-sm text-text-secondary">{equipmentName(equipment)}</Text>}
        </View>
        <View className="mt-1 ml-1">
          <HistoryRecordSetsView sets={props.entry.sets} settings={props.settings} isNext={true} />
        </View>
      </View>
      {description && (
        <View className="mt-1">
          <SimpleMarkdown value={description} className="text-sm" />
        </View>
      )}
    </View>
  );
}

interface IProgramPreviewPlaygroundProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  settings: ISettings;
  stats: IStats;
  progress: IHistoryRecord;
  dayIndex: number;
  index: number;
  staticState?: IProgramState;
  dispatch: IDispatch;
}

function ProgramPreviewPlayground(props: IProgramPreviewPlaygroundProps): JSX.Element {
  const exercise = Exercise_get(props.entry.exercise, props.settings.exercises);
  const programExercise = props.programExercise;
  const dayData = Program_getDayData(props.program, props.dayIndex);
  const description = PlannerProgramExercise_currentDescription(programExercise);
  const currentEquipmentName = Equipment_getEquipmentNameForExerciseType(props.settings, exercise);
  const exerciseNotes = Exercise_getNotes(props.entry.exercise, props.settings);
  const supersetEntry = Progress_getNextSupersetEntry(props.progress.entries, props.entry);
  const supersetExercise = supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined;

  return (
    <View
      className={`pt-2 pb-2 mb-6 rounded-lg ${WorkoutExerciseUtils_getBgColor50(props.entry.sets, false)} relative`}
      data-cy={`entry-${StringUtils_dashcase(exercise.name)}`}
      testID={`entry-${StringUtils_dashcase(exercise.name)}`}
    >
      <View>
        <PlaygroundExerciseTopBar
          dispatch={props.dispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          isPlayground={true}
          xOffset={20}
        />
        <View className="flex-row items-center mx-4">
          <View style={{ width: 40 }} className="mr-1">
            <View className="p-1 rounded-lg bg-background-image">
              <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
            </View>
          </View>
          <View className="flex-1 ml-auto" style={{ minWidth: 64 }}>
            <View className="flex-row items-center">
              <Text className="flex-1 mr-1 font-bold">{Exercise_nameWithEquipment(exercise, props.settings)}</Text>
            </View>
            <Text data-cy="exercise-equipment" testID="exercise-equipment" className="text-xs text-text-secondary">
              Equipment: <Text className="font-bold">{currentEquipmentName || "None"}</Text>
            </Text>
            {supersetExercise && (
              <Text data-cy="exercise-superset" testID="exercise-superset" className="text-xs text-text-secondary">
                Supersets with: <Text className="font-bold">{Exercise_fullName(supersetExercise, props.settings)}</Text>
              </Text>
            )}
          </View>
        </View>
        {exerciseNotes && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Exercise Notes" />}
            <SimpleMarkdown value={exerciseNotes} className="text-sm" />
          </View>
        )}
        {description && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Program Exercise Description" />}
            <SimpleMarkdown value={description} className="text-sm" />
          </View>
        )}
        <View className="mt-1">
          <WorkoutExerciseAllSets
            isPlayground={true}
            day={dayData.day}
            isCurrentProgress={true}
            progress={props.progress}
            program={props.program}
            programExercise={props.programExercise}
            stats={props.stats}
            entry={props.entry}
            entryIndex={props.index}
            otherStates={props.program.states}
            userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.key]}
            exerciseType={props.entry.exercise}
            lbSets={lb<IHistoryRecord>().p("entries").i(props.index).p("sets")}
            lbWarmupSets={lb<IHistoryRecord>().p("entries").i(props.index).p("warmupSets")}
            settings={props.settings}
            dispatch={props.dispatch}
            subscription={undefined}
          />
        </View>
      </View>
    </View>
  );
}

interface IPlaygroundExerciseTopBarProps {
  dispatch: IDispatch;
  index: number;
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  isPlayground: boolean;
  xOffset?: number;
}

function PlaygroundExerciseTopBar(props: IPlaygroundExerciseTopBarProps): JSX.Element {
  return (
    <View
      className="absolute z-0 px-2 py-1 rounded-full bg-background-neutral"
      style={{ right: -12 + (props.xOffset ?? 0), top: -18 }}
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          data-cy="program-preview-edit-exercise"
          testID="program-preview-edit-exercise"
          onPress={() => {
            props.dispatch({
              type: "UpdateProgress",
              lensRecordings: [lb<IHistoryRecord>().pi("ui", {}).p("editModal").record(undefined)],
              desc: "clear-edit-modal",
            });
            setTimeout(() => {
              props.dispatch({
                type: "UpdateProgress",
                lensRecordings: [
                  lb<IHistoryRecord>()
                    .pi("ui", {})
                    .p("editModal")
                    .record({ programExerciseId: props.programExercise.key, entryIndex: props.index }),
                ],
                desc: "open-edit-exercise-modal",
              });
            }, 0);
          }}
        >
          <IconEditSquare color={Tailwind_semantic().icon.neutralsubtle} />
        </Pressable>
        {props.isPlayground && (
          <Pressable
            data-cy="program-preview-complete-exercise"
            testID="program-preview-complete-exercise"
            onPress={() => {
              props.dispatch({
                type: "UpdateProgress",
                lensRecordings: [
                  lb<IHistoryRecord>()
                    .pi("entries")
                    .i(props.index)
                    .p("sets")
                    .recordModify((sets) =>
                      sets.map((s) => {
                        const newSet = { ...s, completedReps: s.reps, completedWeight: s.weight };
                        return newSet.completedReps != null && newSet.completedWeight != null
                          ? { ...newSet, isCompleted: true }
                          : s;
                      })
                    ),
                  lb<IHistoryRecord>()
                    .pi("entries")
                    .i(props.index)
                    .p("warmupSets")
                    .recordModify((sets) =>
                      sets.map((s) => {
                        const newSet = { ...s, completedReps: s.reps, completedWeight: s.weight };
                        return newSet.completedReps != null && newSet.completedWeight != null
                          ? { ...newSet, isCompleted: true }
                          : s;
                      })
                    ),
                ],
                desc: "complete-all-sets",
              });
            }}
          >
            <IconCheckCircle isChecked={true} color={Reps_isCompleted(props.entry.sets) ? "#38A169" : "#BAC4CD"} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
