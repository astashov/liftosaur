import { JSX, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, InteractionManager } from "react-native";
import { useTrackClick } from "../utils/clickTracking";
import { IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { IDispatch } from "../ducks/types";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { History_workoutTime, History_isPaused } from "../models/history";
import { Progress_lbProgress, Progress_isCurrent, Progress_getActiveSetTimer } from "../models/progress";
import { INavCommon, updateState } from "../models/state";
import { DateUtils_format } from "../utils/date";
import { TimeUtils_formatHHMM } from "../utils/time";
import { useNavOptions } from "../navigation/useNavOptions";
import { Timer } from "./timer";
import { Workout } from "./workout";
import { WorkoutFinishButton } from "./workoutFinishButton";
import { WorkoutMenu } from "./workoutMenu";
import { Thunk_updateLiveActivity, Thunk_deleteProgress, Thunk_pauseWorkout } from "../ducks/thunks";
import { Reps_findNextSetIndex } from "../models/set";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { navigateToModal, getCurrentRouteName } from "../navigation/navigationService";
import { Dialog_confirm } from "../utils/dialog";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { IWorkoutProgressView, WorkoutProgressView_next } from "../utils/workoutProgressView";

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

  const setTimerModal = Progress_getActiveSetTimer(progress);
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

  const roundingModal = progress.ui?.roundingModal;
  const prevRoundingModal = useRef<typeof roundingModal>(undefined);
  useEffect(() => {
    if (roundingModal && !prevRoundingModal.current) {
      navigateToModal("roundingInfoModal", { context: "workout", progressId: progress.id });
    }
    prevRoundingModal.current = roundingModal;
  }, [roundingModal, progress.id]);

  const dispatch = props.dispatch;
  const trackClick = useTrackClick();
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
    trackClick("workout-delete");
    onDeletePress().catch(() => undefined);
  }, [onDeletePress, trackClick]);

  const onTitleClick = useCallback(() => {
    trackClick("workout-change-date");
    dispatch({
      type: "ChangeDate",
      id: progress.id,
      date: progress.date,
      time: History_workoutTime(progress),
    });
    navigateToModal("dateModal", { progressId: progress.id });
  }, [dispatch, progress, trackClick]);

  const onPauseResume = useCallback(() => {
    trackClick(History_isPaused(props.progress.intervals) ? "workout-resume" : "workout-pause");
    if (History_isPaused(props.progress.intervals)) {
      dispatch({
        type: "ResumeWorkoutAction",
        isPlayground: false,
        hasSubscription: Subscriptions_hasSubscription(props.subscription),
      });
      const currentEntryIndex = props.progress.currentEntryIndex || 0;
      const currentEntry = props.progress.entries[currentEntryIndex];
      const setIndex = currentEntry ? Reps_findNextSetIndex(currentEntry) : 0;
      dispatch(Thunk_updateLiveActivity(currentEntryIndex, setIndex, props.progress.timer, props.progress.timerSince));
    } else {
      dispatch(Thunk_pauseWorkout());
    }
  }, [dispatch, props.progress, props.settings, props.subscription, trackClick]);

  const progressStartTime = progress.startTime;
  const progressEndTime = progress.endTime;
  const progressIntervals = progress.intervals;
  const navSubtitle = useMemo(() => {
    return !isCurrent && progressEndTime ? (
      TimeUtils_formatHHMM(
        History_workoutTime({ startTime: progressStartTime, endTime: progressEndTime, intervals: progressIntervals })
      )
    ) : (
      <Timer
        startTime={progressStartTime}
        endTime={progressEndTime}
        intervals={progressIntervals}
        onPauseResume={onPauseResume}
      />
    );
  }, [isCurrent, progressStartTime, progressEndTime, progressIntervals, onPauseResume]);

  const progressId = progress.id;
  const onShare = useCallback(() => {
    if (!isCurrent) {
      navigateToModal("workoutShareModal", { progressId });
    }
  }, [isCurrent, progressId]);
  const onConvertToProgram = useCallback(() => {
    navigateToModal("dayFromAdhocModal", { progressId });
  }, [progressId]);

  // A ref, so these elements survive a set completion. A new element re-renders the navbar header.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const navRightButtons = useMemo(
    () => [
      <WorkoutFinishButton
        key="finish"
        progressRef={progressRef}
        isCurrent={isCurrent}
        settings={props.settings}
        dispatch={dispatch}
      />,
    ],
    [isCurrent, props.settings, dispatch]
  );
  const renderHeaderMenu = useCallback(
    (onOpenChange: (isOpen: boolean) => void) => (
      <WorkoutMenu
        progress={progressRef.current}
        program={evaluatedProgram}
        allPrograms={props.allPrograms}
        settings={settings}
        dispatch={dispatch}
        onShare={onShare}
        onConvertToProgram={onConvertToProgram}
        onDelete={onDeletePressHandler}
        onOpenChange={onOpenChange}
      />
    ),
    [settings, dispatch, evaluatedProgram, props.allPrograms, onShare, onConvertToProgram, onDeletePressHandler]
  );
  const progressViewRef = useRef<IWorkoutProgressView | undefined>(undefined);
  const progressView = WorkoutProgressView_next(progressViewRef.current, progress);
  progressViewRef.current = progressView;

  useNavOptions({
    navTitle: isCurrent ? "Ongoing workout" : `${DateUtils_format(progress.date)}`,
    navOnTitleClick: !isCurrent ? onTitleClick : undefined,
    navSubtitle,
    navRightButtons,
  });

  if (progress != null) {
    return (
      <Workout
        stats={props.navCommon.stats}
        allPrograms={props.allPrograms}
        subscription={props.subscription}
        history={props.history}
        helps={props.helps}
        settings={props.settings}
        program={evaluatedProgram}
        isTimerShown={true}
        programDay={programDay}
        progress={progressView}
        dispatch={props.dispatch}
        renderHeaderMenu={renderHeaderMenu}
      />
    );
  } else {
    return null;
  }
}

export const ScreenWorkout = memo(ScreenWorkoutInner);
