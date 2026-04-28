import { JSX, useEffect, useRef } from "react";
import { Pressable } from "react-native";
import { IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { IDispatch } from "../ducks/types";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import {
  History_workoutTime,
  History_isPaused,
  History_resumeWorkoutAction,
  History_pauseWorkoutAction,
} from "../models/history";
import { Progress_lbProgress, Progress_isCurrent } from "../models/progress";
import { INavCommon, updateState } from "../models/state";
import { DateUtils_format } from "../utils/date";
import { TimeUtils_formatHHMM } from "../utils/time";
import { IconTrash } from "./icons/iconTrash";
import { useNavOptions } from "../navigation/useNavOptions";
import { Timer } from "./timer";
import { Workout } from "./workout";
import { Thunk_updateLiveActivity, Thunk_deleteProgress } from "../ducks/thunks";
import { Reps_findNextSetIndex } from "../models/set";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { workoutTourConfig } from "./tour/workoutTourConfig";
import { navigationRef } from "../navigation/navigationRef";
import { Dialog_confirm } from "../utils/dialog";

interface IScreenWorkoutProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  currentProgram?: IProgram;
  stats: IStats;
  allPrograms: IProgram[];
  settings: ISettings;
  userId?: string;
  helps: string[];
  dispatch: IDispatch;
  subscription: ISubscription;
  navCommon: INavCommon;
}

export function ScreenWorkout(props: IScreenWorkoutProps): JSX.Element | null {
  const progress = props.progress;
  const evaluatedProgram = props.program ? Program_evaluate(props.program, props.settings) : undefined;
  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, progress.day) : undefined;

  useEffect(() => {
    if (progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [
          Progress_lbProgress(progress.id)
            .pi("ui", {})
            .p("exercisePicker")
            .record({
              state: {
                mode: "workout",
                screenStack: ["exercisePicker"],
                sort: "name_asc",
                filters: {},
                selectedExercises: [],
              },
            }),
        ],
        "Open exercise picker on workout start"
      );
      navigationRef.navigate("exercisePickerModal", { progressId: progress.id });
    }
  }, []);

  const amrapModal = progress.ui?.amrapModal;
  const prevAmrapNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (amrapModal && amrapModal.nonce !== prevAmrapNonce.current) {
      prevAmrapNonce.current = amrapModal.nonce;
      navigationRef.navigate("amrapModal", { ...amrapModal, context: "workout", progressId: progress.id });
    }
  }, [amrapModal]);

  const exercisePickerState = progress.ui?.exercisePicker?.state;
  const prevExercisePickerState = useRef<typeof exercisePickerState>(undefined);
  useEffect(() => {
    if (exercisePickerState && !prevExercisePickerState.current) {
      navigationRef.navigate("exercisePickerModal", { progressId: progress.id });
    }
    prevExercisePickerState.current = exercisePickerState;
  }, [exercisePickerState]);

  const editSetModal = progress.ui?.editSetModal;
  const prevEditSetModal = useRef<typeof editSetModal>(undefined);
  useEffect(() => {
    if (editSetModal && !prevEditSetModal.current) {
      navigationRef.navigate("editSetTargetModal", { context: "workout", progressId: progress.id });
    }
    prevEditSetModal.current = editSetModal;
  }, [editSetModal]);

  const onDeletePress = async (): Promise<void> => {
    const confirmed = await Dialog_confirm(
      `Are you sure you want to delete this ${Progress_isCurrent(props.progress) ? "ONGOING" : "PAST"} workout?`
    );
    if (confirmed) {
      props.dispatch(Thunk_deleteProgress());
    }
  };

  useNavOptions({
    navHelpTourId: workoutTourConfig.id,
    navTitle: Progress_isCurrent(progress) ? "Ongoing workout" : `${DateUtils_format(progress.date)}`,
    navOnTitleClick: !Progress_isCurrent(progress)
      ? () => {
          props.dispatch({
            type: "ChangeDate",
            date: progress.date,
            time: History_workoutTime(progress),
          });
          navigationRef.navigate("dateModal", { progressId: progress.id });
        }
      : undefined,
    navSubtitle:
      !Progress_isCurrent(progress) && progress.endTime ? (
        TimeUtils_formatHHMM(History_workoutTime(props.progress))
      ) : (
        <Timer
          progress={props.progress}
          onPauseResume={() => {
            if (History_isPaused(props.progress.intervals)) {
              History_resumeWorkoutAction(
                props.dispatch,
                false,
                props.settings,
                Subscriptions_hasSubscription(props.subscription)
              );
              const currentEntryIndex = props.progress.ui?.currentEntryIndex || 0;
              const currentEntry = props.progress.entries[currentEntryIndex];
              const setIndex = currentEntry ? Reps_findNextSetIndex(currentEntry) : 0;
              props.dispatch(
                Thunk_updateLiveActivity(currentEntryIndex, setIndex, props.progress.timer, props.progress.timerSince)
              );
            } else {
              History_pauseWorkoutAction(props.dispatch);
            }
          }}
        />
      ),
    navRightButtons: [
      <Pressable
        key="delete"
        data-testid="delete-progress"
        testID="delete-progress"
        className="p-2"
        onPress={() => {
          onDeletePress().catch(() => undefined);
        }}
      >
        <IconTrash />
      </Pressable>,
    ],
  });

  if (progress != null) {
    return (
      <Workout
        onShare={() => {
          if (!Progress_isCurrent(progress)) {
            navigationRef.navigate("workoutShareModal", { progressId: progress.id });
          }
        }}
        stats={props.navCommon.stats}
        allPrograms={props.allPrograms}
        subscription={props.subscription}
        history={props.history}
        helps={props.helps}
        settings={props.settings}
        program={evaluatedProgram}
        isTimerShown={true}
        programDay={programDay}
        progress={progress}
        dispatch={props.dispatch}
      />
    );
  } else {
    return null;
  }
}
