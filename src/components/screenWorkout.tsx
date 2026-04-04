import { JSX, useEffect, useRef, useState } from "react";
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
import { INavCommon, updateProgress, updateState } from "../models/state";
import { DateUtils_format } from "../utils/date";
import { TimeUtils_formatHHMM } from "../utils/time";
import { IconTrash } from "./icons/iconTrash";
import { useNavOptions } from "../navigation/useNavOptions";
import { Timer } from "./timer";
import { Workout } from "./workout";
import { ModalDate } from "./modalDate";
import { lb } from "lens-shmens";
import { Modal1RM } from "./modal1RM";
import { ModalEquipment } from "./modalEquipment";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { BottomSheetMobileShareOptions } from "./bottomSheetMobileShareOptions";
import { BottomSheetWebappShareOptions } from "./bottomSheetWebappShareOptions";
import { Thunk_updateLiveActivity, Thunk_deleteProgress } from "../ducks/thunks";
import { BottomSheetWorkoutSuperset } from "./bottomSheetWorkoutSuperset";
import { Reps_findNextSetIndex } from "../models/set";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { workoutTourConfig } from "./tour/workoutTourConfig";
import { navigationRef } from "../navigation/navigationRef";

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
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const dateModal = progress.ui?.dateModal;
  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, progress.day) : undefined;

  useEffect(() => {
    if (progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [
          Progress_lbProgress(progress.id)
            .pi("ui")
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
  const prevAmrapModal = useRef(amrapModal);
  useEffect(() => {
    if (amrapModal && !prevAmrapModal.current) {
      navigationRef.navigate("amrapModal", { ...amrapModal, progressId: progress.id });
    }
    prevAmrapModal.current = amrapModal;
  }, [amrapModal]);

  const exerciseSuperset = progress.ui?.showSupersetPicker;

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
      <button
        key="delete"
        className="p-2 nm-delete-progress ls-delete-progress"
        onClick={() => {
          if (
            confirm(
              `Are you sure you want to delete this ${Progress_isCurrent(props.progress) ? "ONGOING" : "PAST"} workout?`
            )
          ) {
            props.dispatch(Thunk_deleteProgress());
          }
        }}
      >
        <IconTrash />
      </button>,
    ],
  });

  if (progress != null) {
    return (
      <>
        <Workout
          setIsShareShown={setIsShareShown}
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
        {dateModal != null && (
          <ModalDate
            isHidden={false}
            dispatch={props.dispatch}
            date={dateModal.date ?? ""}
            time={dateModal.time ?? 0}
          />
        )}
        {exerciseSuperset && (
          <BottomSheetWorkoutSuperset
            isHidden={exerciseSuperset == null}
            onClose={() => {
              updateProgress(
                props.dispatch,
                [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(undefined)],
                "Close superset picker"
              );
            }}
            progress={progress}
            entry={exerciseSuperset}
            settings={props.settings}
            onSelect={(selectedEntry) => {
              updateProgress(
                props.dispatch,
                [
                  lb<IHistoryRecord>()
                    .p("entries")
                    .findBy("id", exerciseSuperset.id)
                    .p("superset")
                    .record(selectedEntry),
                ],
                "select-superset-entry"
              );
              updateProgress(
                props.dispatch,
                [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(undefined)],
                "Close superset picker"
              );
            }}
          />
        )}
        {progress.ui?.equipmentModal?.exerciseType && (
          <ModalEquipment
            stats={props.stats}
            onClose={() => {
              updateState(
                props.dispatch,
                [Progress_lbProgress(progress.id).pi("ui").p("equipmentModal").record(undefined)],
                "Close equipment modal"
              );
            }}
            settings={props.settings}
            exercise={progress.ui?.equipmentModal.exerciseType}
            entries={progress.entries}
            dispatch={props.dispatch}
          />
        )}
        {progress.ui?.rm1Modal?.exerciseType && (
          <Modal1RM
            onClose={() => {
              updateState(
                props.dispatch,
                [Progress_lbProgress(progress.id).pi("ui").p("rm1Modal").record(undefined)],
                "Close 1RM modal"
              );
            }}
            settings={props.settings}
            exercise={progress.ui?.rm1Modal.exerciseType}
            dispatch={props.dispatch}
          />
        )}
        {!Progress_isCurrent(progress) &&
          ((SendMessage_isIos() && SendMessage_iosAppVersion() >= 11) ||
          (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 20) ? (
            <BottomSheetMobileShareOptions
              userId={props.userId}
              history={props.history}
              settings={props.settings}
              record={progress}
              isHidden={!isShareShown}
              onClose={() => setIsShareShown(false)}
            />
          ) : (
            <BottomSheetWebappShareOptions
              userId={props.userId}
              history={props.history}
              settings={props.settings}
              record={progress}
              isHidden={!isShareShown}
              onClose={() => setIsShareShown(false)}
            />
          ))}
      </>
    );
  } else {
    return null;
  }
}
