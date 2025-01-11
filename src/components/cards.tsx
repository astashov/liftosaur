import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { memo } from "react";
import {
  IHistoryRecord,
  IProgram,
  ISettings,
  IProgressMode,
  IProgramExercise,
  ISubscription,
  IExerciseType,
  IProgramDay,
} from "../types";
import { IState, updateState } from "../models/state";
import { Thunk } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IconEditSquare } from "./icons/iconEditSquare";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { IconNotebook } from "./icons/iconNotebook";
import { LinkButton } from "./linkButton";
import { Program } from "../models/program";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { Exercise } from "../models/exercise";
import { Markdown } from "./markdown";
import { View, TextInput, TouchableOpacity } from "react-native";
import { LftText } from "./lftText";

interface ICardsViewProps {
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  program?: IProgram;
  programDay?: IProgramDay;
  userId?: string;
  nickname?: string;
  helps: string[];
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode, entryIndex: number, setIndex: number) => void;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    exerciseType?: IExerciseType
  ) => void;
  setIsShareShown: (isShown: boolean) => void;
}

export const CardsView = memo((props: ICardsViewProps): JSX.Element => {
  const { program } = props;
  return (
    <View className="px-4 pb-4">
      <View className="flex flex-row pb-2">
        <View className="flex flex-row items-center flex-1">
          <View className="flex-1 mr-2 align-middle">
            <LftText className="text-lg font-semibold">{props.progress?.programName}</LftText>
            <LftText data-cy="day-name" className="text-sm text-grayv2-main">
              {props.progress?.dayName}
            </LftText>
          </View>
          <View className="flex-row mr-2 align-middle">
            {program && (
              <TouchableOpacity
                className="px-2 ml-1 align-middle nm-workout-edit-day"
                onPress={() => {
                  if (program.planner) {
                    const dayData = Program.getDayData(program, props.progress.day, props.settings);
                    const plannerState = EditProgram.initPlannerState(program.id, program.planner, dayData);
                    Program.editAction(props.dispatch, program.id, plannerState);
                  } else {
                    const programDay = Program.getProgramDay(program, props.progress.day);
                    const dayIndex = programDay ? program.days.indexOf(programDay) : props.progress.day - 1;
                    Progress.editDayAction(props.dispatch, props.progress.programId, dayIndex);
                  }
                }}
              >
                <IconEditSquare />
              </TouchableOpacity>
            )}
            {program && (
              <TouchableOpacity
                onPress={() => {
                  const dayIndex = Program.getProgramDayIndex(program, props.progress.day);
                  updateState(props.dispatch, [
                    lb<IState>().p("muscleView").record({ type: "day", programId: program.id, dayIndex }),
                  ]);
                  props.dispatch(Thunk.pushScreen("muscles"));
                }}
                className="px-2 align-middle nm-workout-day-muscles"
              >
                <IconMuscles2 />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!Progress.isCurrent(props.progress) && (
          <View className="pt-1 pl-2">
            <Button
              name="finish-day-share"
              className="ls-finish-day-share"
              kind="purple"
              onClick={() => {
                if (props.userId == null) {
                  alert("You should be logged in to share workouts.");
                } else {
                  props.setIsShareShown(true);
                }
              }}
            >
              Share
            </Button>
          </View>
        )}
      </View>
      {props.programDay?.description && <Markdown value={props.programDay.description} />}
      {props.progress.entries.map((entry, index) => {
        let programExercise: IProgramExercise | undefined;
        if (props.program) {
          programExercise = props.program.exercises.find((e) => e.id === entry.programExerciseId);
        }
        const currentGymId = props.settings.currentGymId || props.settings.gyms[0]?.id || "";
        const currentEquipment = props.settings.exerciseData[Exercise.toKey(entry.exercise)]?.equipment?.[currentGymId];
        const hidePlatesCalculator = !currentEquipment;

        return (
          <ExerciseView
            key={Exercise.toKey(entry.exercise)}
            programMode={Program.programMode(props.program)}
            history={props.history}
            helps={props.helps}
            showHelp={true}
            showEditButtons={true}
            progress={props.progress}
            settings={props.settings}
            index={index}
            entry={entry}
            hidePlatesCalculator={hidePlatesCalculator}
            programExercise={programExercise}
            program={props.program}
            subscription={props.subscription}
            dayData={Progress.getDayData(props.progress)}
            dispatch={props.dispatch}
            onChangeReps={props.onChangeReps}
            onExerciseInfoClick={() => {
              props.dispatch(Thunk.pushExerciseStatsScreen(entry.exercise));
            }}
            onStartSetChanging={props.onStartSetChanging}
          />
        );
      })}
      <View style={{ marginTop: -4 }} className="text-xs">
        <LinkButton
          name="add-exercise-to-workout"
          data-cy="add-exercise-button"
          onPress={() => {
            Progress.showAddExerciseModal(props.dispatch, props.progress.id);
          }}
        >
          Add exercise (only to this workout)
        </LinkButton>
      </View>
      <View>
        <GroupHeader
          name="Notes"
          help={
            <View>
              <LftText>
                Notes for the workout. You can also add notes per specific exercise by tapping{" "}
                <IconNotebook className="inline-block" /> for that exercise.
              </LftText>
            </View>
          }
        />
        <TextInput
          data-cy="workout-notes-input"
          id="workout-notes"
          maxLength={4095}
          placeholder="The workout went very well..."
          value={props.progress.notes}
          onChangeText={(v: string) => {
            Progress.editNotes(props.dispatch, props.progress.id, v);
          }}
          className={`${inputClassName} h-32`}
        />
      </View>
      <View className="pt-1 pb-3 text-center">
        <Button
          name={Progress.isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
          kind="orange"
          data-cy="finish-workout"
          className={Progress.isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
          onClick={() => {
            if (
              (Progress.isCurrent(props.progress) && Progress.isFullyFinishedSet(props.progress)) ||
              confirm("Are you sure?")
            ) {
              props.dispatch({ type: "FinishProgramDayAction" });
            }
          }}
        >
          {Progress.isCurrent(props.progress) ? "Finish the workout" : "Save"}
        </Button>
      </View>
    </View>
  );
});
