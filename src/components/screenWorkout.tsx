import { h, JSX, Fragment } from "preact";
import { IExercisePickerState, IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { useEffect, useState } from "preact/hooks";
import { buildCustomDispatch, IDispatch } from "../ducks/types";
import {
  Program_evaluate,
  Program_isEmpty,
  Program_getProgramDay,
  Program_getProgramExercise,
  Program_getFirstProgramExercise,
  Program_getProgramExerciseByTypeWeekAndDay,
  Program_nextHistoryEntry,
  Program_getDayData,
} from "../models/program";
import {
  History_workoutTime,
  History_isPaused,
  History_resumeWorkoutAction,
  History_pauseWorkoutAction,
  History_calories,
  History_pauseWorkout,
} from "../models/history";
import {
  Progress_lbProgress,
  Progress_isCurrent,
  Progress_isFullyFinishedSet,
  Progress_forceUpdateEntryIndex,
  Progress_addExercise,
  Progress_changeExercise,
} from "../models/progress";
import { INavCommon, updateProgress, updateState } from "../models/state";
import { DateUtils_format } from "../utils/date";
import { TimeUtils_formatHHMM } from "../utils/time";
import { Footer2View } from "./footer2";
import { IconTrash } from "./icons/iconTrash";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Timer } from "./timer";
import { Button } from "./button";
import { Workout } from "./workout";
import { ModalAmrap } from "./modalAmrap";
import { ModalDate } from "./modalDate";
import { Exercise_handleCustomExerciseChange } from "../models/exercise";
import { lb } from "lens-shmens";
import { Modal1RM } from "./modal1RM";
import { ModalEquipment } from "./modalEquipment";
import { BottomSheetEditTarget } from "./bottomSheetEditTarget";
import {
  SendMessage_toIosAndAndroid,
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { BottomSheetMobileShareOptions } from "./bottomSheetMobileShareOptions";
import { BottomSheetWebappShareOptions } from "./bottomSheetWebappShareOptions";
import { Thunk_updateLiveActivity, Thunk_postevent } from "../ducks/thunks";
import { BottomSheetExercisePicker } from "./exercisePicker/bottomSheetExercisePicker";
import { ILensDispatch } from "../utils/useLensReducer";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../models/settings";
import { BottomSheetWorkoutSuperset } from "./bottomSheetWorkoutSuperset";
import { Reps_findNextSetIndex } from "../models/set";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";

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

function buildExercisePickerDispatch(
  originalDispatch: IDispatch,
  progressId: number
): ILensDispatch<IExercisePickerState> {
  const prefix = Progress_lbProgress(progressId).pi("ui").pi("exercisePicker").pi("state");
  return buildCustomDispatch(originalDispatch, prefix);
}

export function ScreenWorkout(props: IScreenWorkoutProps): JSX.Element | null {
  const progress = props.progress;
  const evaluatedProgram = props.program ? Program_evaluate(props.program, props.settings) : undefined;
  const evaluatedCurrentProgram =
    Program_isEmpty(evaluatedProgram) && props.currentProgram
      ? Program_evaluate(props.currentProgram, props.settings)
      : evaluatedProgram;
  const dispatch = props.dispatch;
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
    }
  }, []);
  const exercisePickerState = progress.ui?.exercisePicker?.state;
  const exerciseSuperset = progress.ui?.showSupersetPicker;

  if (progress != null) {
    return (
      <Surface
        navbar={
          <NavbarView
            navCommon={props.navCommon}
            dispatch={dispatch}
            onTitleClick={() => {
              if (!Progress_isCurrent(progress)) {
                props.dispatch({
                  type: "ChangeDate",
                  date: progress.date,
                  time: History_workoutTime(progress),
                });
              }
            }}
            title={Progress_isCurrent(progress) ? "Ongoing workout" : `${DateUtils_format(progress.date)}`}
            subtitle={
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
                        Thunk_updateLiveActivity(
                          currentEntryIndex,
                          setIndex,
                          props.progress.timer,
                          props.progress.timerSince
                        )
                      );
                    } else {
                      History_pauseWorkoutAction(props.dispatch);
                    }
                  }}
                />
              )
            }
            rightButtons={[
              <button
                className="p-2 mr-2 nm-delete-progress ls-delete-progress"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete this ${Progress_isCurrent(props.progress) ? "ONGOING" : "PAST"} workout?`
                    )
                  ) {
                    props.dispatch({ type: "DeleteProgress" });
                  }
                }}
              >
                <IconTrash />
              </button>,
              <Button
                name={Progress_isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
                kind="purple"
                buttonSize="md"
                data-cy="finish-workout"
                className={Progress_isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
                onClick={() => {
                  if (
                    (Progress_isCurrent(props.progress) && Progress_isFullyFinishedSet(props.progress)) ||
                    confirm(
                      Progress_isCurrent(props.progress)
                        ? "Are you sure you want to FINISH this workout? Some sets are not marked as completed."
                        : "Are you sure you want to SAVE this PAST workout?"
                    )
                  ) {
                    SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
                    props.dispatch({ type: "FinishProgramDayAction" });
                    if (Progress_isCurrent(props.progress)) {
                      props.dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(props.progress) }));
                      const healthName = SendMessage_isIos() ? "Apple Health" : "Google Health";
                      const shouldSyncToHealth =
                        ((HealthSync_eligibleForAppleHealth() && props.settings.appleHealthSyncWorkout) ||
                          (HealthSync_eligibleForGoogleHealth() && props.settings.googleHealthSyncWorkout)) &&
                        (!props.settings.healthConfirmation ||
                          confirm(`Do you want to sync this workout to ${healthName}?`));
                      SendMessage_toIosAndAndroid({
                        type: "finishWorkout",
                        healthSync: shouldSyncToHealth ? "true" : "false",
                        calories: `${History_calories(props.progress)}`,
                        intervals: JSON.stringify(History_pauseWorkout(progress.intervals)),
                      });
                    }
                  }
                }}
              >
                {Progress_isCurrent(props.progress) ? "Finish" : "Save"}
              </Button>,
            ]}
          />
        }
        footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
        addons={
          <>
            {progress?.ui?.amrapModal && (
              <ModalAmrap
                isPlayground={false}
                settings={props.settings}
                dispatch={props.dispatch}
                programExercise={
                  Program_getProgramExercise(
                    progress.day,
                    evaluatedProgram,
                    progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.programExerciseId
                  ) ||
                  Program_getFirstProgramExercise(
                    evaluatedProgram,
                    progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.programExerciseId
                  )
                }
                progress={progress}
                onDone={() => {
                  Progress_forceUpdateEntryIndex(props.dispatch);
                }}
              />
            )}
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
            {exercisePickerState && (
              <BottomSheetExercisePicker
                settings={props.settings}
                isLoggedIn={!!props.navCommon.userId}
                isHidden={exercisePickerState == null}
                usedExerciseTypes={progress.entries.map((e) => e.exercise)}
                onChoose={(selectedExercises) => {
                  for (const exercise of selectedExercises) {
                    if (exercise.type === "adhoc") {
                      if (exercisePickerState.entryIndex == null) {
                        Progress_addExercise(props.dispatch, exercise.exerciseType, progress.entries.length);
                      } else {
                        Progress_changeExercise(
                          props.dispatch,
                          props.settings,
                          props.progress.id,
                          exercise.exerciseType,
                          exercisePickerState.entryIndex,
                          !!props.settings.workoutSettings.shouldKeepProgramExerciseId
                        );
                      }
                    } else if (exercise.type === "program" && evaluatedCurrentProgram) {
                      const programExercise = Program_getProgramExerciseByTypeWeekAndDay(
                        evaluatedCurrentProgram,
                        exercise.exerciseType,
                        exercise.week,
                        exercise.dayInWeek
                      );
                      if (programExercise && programExercise.exerciseType) {
                        if (exercisePickerState.entryIndex == null) {
                          updateProgress(
                            dispatch,
                            [
                              lb<IHistoryRecord>()
                                .p("entries")
                                .recordModify((entries) => {
                                  const nextHistoryEntry = Program_nextHistoryEntry(
                                    evaluatedCurrentProgram,
                                    Program_getDayData(evaluatedCurrentProgram, evaluatedCurrentProgram.nextDay),
                                    entries.length,
                                    { ...programExercise, exerciseType: exercise.exerciseType },
                                    props.stats,
                                    props.settings
                                  );
                                  return [...entries, nextHistoryEntry].map((e, i) => ({ ...e, index: i }));
                                }),
                            ],
                            "add-exercise"
                          );
                        } else {
                          const nextHistoryEntry = Program_nextHistoryEntry(
                            evaluatedCurrentProgram,
                            Program_getDayData(evaluatedCurrentProgram, evaluatedCurrentProgram.nextDay),
                            exercisePickerState.entryIndex,
                            { ...programExercise, exerciseType: exercise.exerciseType },
                            props.stats,
                            props.settings
                          );
                          updateProgress(
                            dispatch,
                            [
                              lb<IHistoryRecord>()
                                .p("entries")
                                .i(exercisePickerState.entryIndex)
                                .record(nextHistoryEntry),
                            ],
                            "change-program-exercise"
                          );
                        }
                      }
                    }
                  }
                  updateState(
                    props.dispatch,
                    [Progress_lbProgress(progress.id).pi("ui").p("exercisePicker").record(undefined)],
                    "Close exercise picker"
                  );
                  setTimeout(() => {
                    Progress_forceUpdateEntryIndex(props.dispatch);
                    document
                      .querySelector(`[data-name=workout-exercise-tab-${progress.entries.length}]`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }, 0);
                }}
                exercisePicker={exercisePickerState}
                onChangeCustomExercise={(action, exercise, notes) => {
                  Exercise_handleCustomExerciseChange(
                    props.dispatch,
                    action,
                    exercise,
                    notes,
                    props.settings,
                    props.program
                  );
                }}
                evaluatedProgram={evaluatedCurrentProgram}
                onStar={(key) => Settings_toggleStarredExercise(props.dispatch, key)}
                onChangeSettings={(pickerSettings) => Settings_changePickerSettings(props.dispatch, pickerSettings)}
                dispatch={buildExercisePickerDispatch(props.dispatch, progress.id)}
                onClose={() => {
                  updateState(
                    props.dispatch,
                    [Progress_lbProgress(progress.id).pi("ui").p("exercisePicker").record(undefined)],
                    "Close exercise picker"
                  );
                }}
              />
            )}
            <BottomSheetEditTarget
              settings={props.settings}
              subscription={props.subscription}
              progress={progress}
              dispatch={dispatch}
              editSetModal={progress.ui?.editSetModal}
              isHidden={progress.ui?.editSetModal == null}
              onClose={() => {
                dispatch({
                  type: "UpdateProgress",
                  lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined)],
                  desc: "Close edit set modal",
                });
              }}
            />
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
        }
      >
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
      </Surface>
    );
  } else {
    return null;
  }
}
