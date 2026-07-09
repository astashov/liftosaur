import { JSX, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, Platform, InteractionManager } from "react-native";
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
import { navigateToModal, getCurrentRouteName } from "../navigation/navigationService";
import { Dialog_confirm } from "../utils/dialog";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";

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

function ScreenWorkoutInner(props: IScreenWorkoutProps): JSX.Element | null {
  usePerfRenderCount("ScreenWorkout");
  const progress = props.progress;
  const program = props.program;
  const settings = props.settings;
  const evaluatedProgram = useMemo(
    () => (program ? Program_evaluate(program, settings) : undefined),
    [program, settings]
  );
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
    }
  }, []);

  const amrapModal = progress.amrapModal;
  const prevAmrapNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (amrapModal && amrapModal.nonce !== prevAmrapNonce.current) {
      prevAmrapNonce.current = amrapModal.nonce;
      navigateToModal("amrapModal", { ...amrapModal, context: "workout", progressId: progress.id });
    }
  }, [amrapModal]);

  const exercisePickerState = progress.ui?.exercisePicker?.state;
  // Track the last state we navigated for by identity (not a truthy edge), which self-heals reopening even if a stale
  // flag lingers (e.g. an app kill left it persisted, or a deferred open below was cancelled) where a `!last` edge
  // would deadlock. The picker writes live UI (search/filters/selection) back into `state`, so its identity also
  // changes on every keystroke — gate the actual navigation on the current route so those mutations don't re-push the
  // modal while it's already open (same approach as the editProgram picker).
  const navigatedExercisePickerState = useRef<typeof exercisePickerState>(undefined);
  useEffect(() => {
    const changed = navigatedExercisePickerState.current !== exercisePickerState;
    navigatedExercisePickerState.current = exercisePickerState;
    if (!exercisePickerState || !changed || getCurrentRouteName() === "exercisePickerModal") {
      return undefined;
    }
    const progressId = progress.id;
    if (Platform.OS === "web") {
      navigateToModal("exercisePickerModal", { progressId });
      return undefined;
    }
    const handle = InteractionManager.runAfterInteractions(() => {
      if (getCurrentRouteName() !== "exercisePickerModal") {
        navigateToModal("exercisePickerModal", { progressId });
      }
    });
    return () => handle.cancel();
  }, [exercisePickerState, progress.id]);

  const editSetModal = progress.ui?.editSetModal;
  const prevEditSetModal = useRef<typeof editSetModal>(undefined);
  useEffect(() => {
    if (editSetModal && !prevEditSetModal.current) {
      navigateToModal("editSetTargetModal", { context: "workout", progressId: progress.id });
    }
    prevEditSetModal.current = editSetModal;
  }, [editSetModal]);

  const setTimerModal = progress.setTimer;
  const prevSetTimerNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (setTimerModal && setTimerModal.nonce !== prevSetTimerNonce.current) {
      prevSetTimerNonce.current = setTimerModal.nonce;
      navigateToModal("setTimerModal", { context: "workout", progressId: progress.id });
    }
  }, [setTimerModal, progress.id]);

  const setTimerEditModal = progress.ui?.setTimerEditModal;
  const prevSetTimerEditModal = useRef<typeof setTimerEditModal>(undefined);
  useEffect(() => {
    if (setTimerEditModal && !prevSetTimerEditModal.current) {
      navigateToModal("setTimerEditModal", { context: "workout", progressId: progress.id });
    }
    prevSetTimerEditModal.current = setTimerEditModal;
  }, [setTimerEditModal, progress.id]);

  const dispatch = props.dispatch;
  const isCurrent = Progress_isCurrent(progress);
  const onDeletePress = useCallback(async (): Promise<void> => {
    const confirmed = await Dialog_confirm(
      `Are you sure you want to delete this ${isCurrent ? "ONGOING" : "PAST"} workout?`
    );
    if (confirmed) {
      dispatch(Thunk_deleteProgress(progress.id));
    }
  }, [dispatch, isCurrent, progress.id]);

  const onDeletePressHandler = useCallback(() => {
    onDeletePress().catch(() => undefined);
  }, [onDeletePress]);

  const onTitleClick = useCallback(() => {
    dispatch({
      type: "ChangeDate",
      id: progress.id,
      date: progress.date,
      time: History_workoutTime(progress),
    });
    navigateToModal("dateModal", { progressId: progress.id });
  }, [dispatch, progress]);

  const onPauseResume = useCallback(() => {
    if (History_isPaused(props.progress.intervals)) {
      History_resumeWorkoutAction(dispatch, false, props.settings, Subscriptions_hasSubscription(props.subscription));
      const currentEntryIndex = props.progress.currentEntryIndex || 0;
      const currentEntry = props.progress.entries[currentEntryIndex];
      const setIndex = currentEntry ? Reps_findNextSetIndex(currentEntry) : 0;
      dispatch(Thunk_updateLiveActivity(currentEntryIndex, setIndex, props.progress.timer, props.progress.timerSince));
    } else {
      History_pauseWorkoutAction(dispatch);
    }
  }, [dispatch, props.progress, props.settings, props.subscription]);

  const navSubtitle = useMemo(() => {
    return !isCurrent && progress.endTime ? (
      TimeUtils_formatHHMM(History_workoutTime(progress))
    ) : (
      <Timer progress={progress} onPauseResume={onPauseResume} />
    );
  }, [isCurrent, progress, onPauseResume]);

  const navRightButtons = useMemo(
    () => [
      <Pressable
        key="delete"
        data-testid="delete-progress"
        testID="delete-progress"
        className="p-2"
        onPress={onDeletePressHandler}
      >
        <IconTrash />
      </Pressable>,
    ],
    [onDeletePressHandler]
  );

  useNavOptions({
    navHelpTourId: workoutTourConfig.id,
    navTitle: isCurrent ? "Ongoing workout" : `${DateUtils_format(progress.date)}`,
    navOnTitleClick: !isCurrent ? onTitleClick : undefined,
    navSubtitle,
    navRightButtons,
  });

  const progressId = progress.id;
  const onShare = useCallback(() => {
    if (!isCurrent) {
      navigateToModal("workoutShareModal", { progressId });
    }
  }, [isCurrent, progressId]);

  if (progress != null) {
    return (
      <Workout
        onShare={onShare}
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

export const ScreenWorkout = memo(ScreenWorkoutInner);
