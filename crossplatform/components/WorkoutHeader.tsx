import type { JSX } from "react";
import { View, Text, TextInput, Pressable, Alert, Platform } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryRecord, IProgram, ISettings, ISubscription } from "@shared/types";
import type { IEvaluatedProgram, IEvaluatedProgramDay } from "@shared/models/program";
import { Program_isEmpty, Program_getDayData, Program_editAction } from "@shared/models/program";
import { Progress_isCurrent, Progress_isFullyFinishedSet, Progress_editNotes } from "@shared/models/progress";
import {
  History_workoutTime,
  History_isPaused,
  History_resumeWorkoutAction,
  History_pauseWorkoutAction,
  History_calories,
  History_pauseWorkout,
} from "@shared/models/history";
import { Reps_findNextSetIndex } from "@shared/models/set";
import { DateUtils_format } from "@shared/utils/date";
import { TimeUtils_formatHHMM } from "@shared/utils/time";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { Thunk_pushScreen, Thunk_postevent, Thunk_updateLiveActivity } from "@shared/ducks/thunks";
import { updateState } from "@shared/models/state";
import { lb } from "lens-shmens";
import type { IState } from "@shared/models/state";
import { Button } from "./Button";
import { WorkoutTimer } from "./WorkoutTimer";
import { IconTrash } from "./icons/IconTrash";
import { IconShare } from "./icons/IconShare";
import { IconMuscles2 } from "./icons/IconMuscles2";
import { IconEdit2 } from "./icons/IconEdit2";
import { MarkdownSimple } from "./MarkdownSimple";

interface IProps {
  progress: IHistoryRecord;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  allPrograms: IProgram[];
  setIsShareShown: (value: boolean) => void;
}

function confirmAction(message: string, onConfirm: () => void): void {
  if (Platform.OS === "web") {
    if (confirm(message)) {
      onConfirm();
    }
  } else {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onConfirm },
    ]);
  }
}

export function WorkoutHeader(props: IProps): JSX.Element {
  const { progress, program, dispatch } = props;
  const isCurrent = Progress_isCurrent(progress);
  const description = props.programDay?.description;
  const currentProgram = props.allPrograms.find((p) => p.id === program?.id);

  return (
    <View className="px-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {isCurrent ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-semibold">Ongoing workout</Text>
              <WorkoutTimer
                progress={progress}
                onPauseResume={() => {
                  if (History_isPaused(progress.intervals)) {
                    History_resumeWorkoutAction(
                      dispatch,
                      false,
                      props.settings,
                      Subscriptions_hasSubscription(props.subscription)
                    );
                    const currentEntryIndex = progress.ui?.currentEntryIndex || 0;
                    const currentEntry = progress.entries[currentEntryIndex];
                    const setIndex = currentEntry ? Reps_findNextSetIndex(currentEntry) : 0;
                    dispatch(
                      Thunk_updateLiveActivity(currentEntryIndex, setIndex, progress.timer, progress.timerSince)
                    );
                  } else {
                    History_pauseWorkoutAction(dispatch);
                  }
                }}
              />
            </View>
          ) : (
            <View>
              <Text className="text-base font-semibold">{DateUtils_format(progress.date)}</Text>
              <Text className="text-sm text-text-secondary">{TimeUtils_formatHHMM(History_workoutTime(progress))}</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="p-2"
            onPress={() => {
              const label = isCurrent ? "ONGOING" : "PAST";
              confirmAction(`Are you sure you want to delete this ${label} workout?`, () => {
                dispatch({ type: "DeleteProgress" });
              });
            }}
          >
            <IconTrash width={15} height={18} />
          </Pressable>
          {!isCurrent && (
            <Pressable className="p-2" onPress={() => props.setIsShareShown(true)}>
              <IconShare size={20} />
            </Pressable>
          )}
          {program && !Program_isEmpty(program) && (
            <Pressable
              className="p-2"
              onPress={() => {
                updateState(
                  dispatch,
                  [lb<IState>().p("muscleView").record({ type: "day", programId: program.id, day: progress.day })],
                  "Show muscle view"
                );
                dispatch(Thunk_pushScreen("muscles"));
              }}
            >
              <IconMuscles2 size={20} />
            </Pressable>
          )}
          {program && currentProgram && !Program_isEmpty(currentProgram) && (
            <Pressable
              className="p-2"
              onPress={() => {
                const dayData = Program_getDayData(program, progress.day);
                Program_editAction(dispatch, currentProgram, dayData);
              }}
            >
              <IconEdit2 size={20} />
            </Pressable>
          )}
          <Button
            name={isCurrent ? "finish-workout" : "save-history-record"}
            kind="purple"
            buttonSize="md"
            data-cy="finish-workout"
            onPress={() => {
              if (isCurrent && Progress_isFullyFinishedSet(progress)) {
                dispatch({ type: "FinishProgramDayAction" });
                dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(progress) }));
              } else {
                const msg = isCurrent
                  ? "Are you sure you want to FINISH this workout? Some sets are not marked as completed."
                  : "Are you sure you want to SAVE this PAST workout?";
                confirmAction(msg, () => {
                  dispatch({ type: "FinishProgramDayAction" });
                  if (isCurrent) {
                    dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(progress) }));
                  }
                });
              }
            }}
          >
            {isCurrent ? "Finish" : "Save"}
          </Button>
        </View>
      </View>
      <View className="flex-row mt-1">
        <View className="flex-1">
          <Text className="text-sm font-semibold">{progress.dayName}</Text>
          <Text className="text-sm text-text-secondary">{progress.programName}</Text>
        </View>
      </View>
      {description && (
        <View className="mt-1">
          <MarkdownSimple value={description} />
        </View>
      )}
      <TextInput
        data-cy="workout-notes-input"
        multiline={true}
        maxLength={4095}
        placeholder="Add workout notes here..."
        value={progress.notes}
        onChangeText={(text) => {
          Progress_editNotes(dispatch, progress.id, text);
        }}
        className="mt-1 text-sm"
      />
    </View>
  );
}
