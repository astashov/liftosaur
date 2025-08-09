import { h, JSX, Fragment } from "preact";
import { IExercisePickerState, IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { useEffect, useState } from "preact/hooks";
import { buildCustomDispatch, IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { History } from "../models/history";
import { Progress } from "../models/progress";
import { INavCommon, IState, updateProgress, updateState } from "../models/state";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { Footer2View } from "./footer2";
import { IconTrash } from "./icons/iconTrash";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Timer } from "./timer";
import { Button } from "./button";
import { Workout } from "./workout";
import { ModalAmrap } from "./modalAmrap";
import { ModalDate } from "./modalDate";
import { Exercise } from "../models/exercise";
import { lb } from "lens-shmens";
import { Modal1RM } from "./modal1RM";
import { ModalEquipment } from "./modalEquipment";
import { BottomSheetEditTarget } from "./bottomSheetEditTarget";
import { SendMessage } from "../utils/sendMessage";
import { BottomSheetMobileShareOptions } from "./bottomSheetMobileShareOptions";
import { BottomSheetWebappShareOptions } from "./bottomSheetWebappShareOptions";
import { Thunk } from "../ducks/thunks";
import { BottomSheetExercisePicker } from "./exercisePicker/bottomSheetExercisePicker";
import { ILensDispatch } from "../utils/useLensReducer";
import { Settings } from "../models/settings";

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
  const prefix = lb<IState>().pi("progress").pi(progressId).pi("ui").pi("exercisePicker").pi("state");
  return buildCustomDispatch(originalDispatch, prefix);
}

export function ScreenWorkout(props: IScreenWorkoutProps): JSX.Element | null {
  const progress = props.progress;
  const evaluatedProgram = props.program ? Program.evaluate(props.program, props.settings) : undefined;
  const evaluatedCurrentProgram =
    Program.isEmpty(evaluatedProgram) && props.currentProgram
      ? Program.evaluate(props.currentProgram, props.settings)
      : evaluatedProgram;
  const dispatch = props.dispatch;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const dateModal = progress.ui?.dateModal;
  const programDay = evaluatedProgram ? Program.getProgramDay(evaluatedProgram, progress.day) : undefined;
  const [forceUpdateEntryIndex, setForceUpdateEntryIndex] = useState(false);

  useEffect(() => {
    if (progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [
          lb<IState>()
            .p("progress")
            .pi(progress.id)
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

  if (progress != null) {
    return (
      <Surface
        navbar={
          <NavbarView
            navCommon={props.navCommon}
            dispatch={dispatch}
            onTitleClick={() => {
              if (!Progress.isCurrent(progress)) {
                props.dispatch({
                  type: "ChangeDate",
                  date: progress.date,
                  time: History.workoutTime(progress),
                });
              }
            }}
            title={Progress.isCurrent(progress) ? "Ongoing workout" : `${DateUtils.format(progress.date)}`}
            subtitle={
              !Progress.isCurrent(progress) && progress.endTime ? (
                TimeUtils.formatHHMM(History.workoutTime(props.progress))
              ) : (
                <Timer
                  progress={props.progress}
                  onPauseResume={() => {
                    if (History.isPaused(props.progress.intervals)) {
                      History.resumeWorkoutAction(props.dispatch, props.settings);
                    } else {
                      History.pauseWorkoutAction(props.dispatch);
                    }
                  }}
                />
              )
            }
            rightButtons={[
              <button
                className="p-2 mr-2 nm-delete-progress ls-delete-progress"
                onClick={() => {
                  if (confirm("Are you sure?")) {
                    props.dispatch({ type: "DeleteProgress" });
                  }
                }}
              >
                <IconTrash />
              </button>,
              <Button
                name={Progress.isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
                kind="purple"
                buttonSize="md"
                data-cy="finish-workout"
                className={Progress.isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
                onClick={() => {
                  if (
                    (Progress.isCurrent(props.progress) && Progress.isFullyFinishedSet(props.progress)) ||
                    confirm("Are you sure?")
                  ) {
                    SendMessage.toIosAndAndroid({ type: "pauseWorkout" });
                    props.dispatch({ type: "FinishProgramDayAction" });
                    if (Progress.isCurrent(props.progress)) {
                      props.dispatch(Thunk.postevent("finish-workout", { workout: JSON.stringify(props.progress) }));
                    }
                  }
                }}
              >
                {Progress.isCurrent(props.progress) ? "Finish" : "Save"}
              </Button>,
            ]}
          />
        }
        footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
        addons={
          <>
            {progress?.ui?.amrapModal && (
              <ModalAmrap
                settings={props.settings}
                dispatch={props.dispatch}
                programExercise={Program.getProgramExercise(
                  progress.day,
                  evaluatedProgram,
                  progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.programExerciseId
                )}
                progress={progress}
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
            {exercisePickerState && (
              <BottomSheetExercisePicker
                settings={props.settings}
                isHidden={exercisePickerState == null}
                usedExerciseTypes={progress.entries.map((e) => e.exercise)}
                onChoose={(selectedExercises) => {
                  for (const exercise of selectedExercises) {
                    if (exercise.type === "adhoc") {
                      if (exercisePickerState.entryIndex == null) {
                        Progress.addExercise(props.dispatch, exercise.exerciseType, progress.entries.length);
                      } else {
                        Progress.changeExercise(
                          props.dispatch,
                          props.progress.id,
                          exercise.exerciseType,
                          exercisePickerState.entryIndex
                        );
                      }
                    } else if (exercise.type === "program" && evaluatedCurrentProgram) {
                      const programExercise = Program.getProgramExerciseByTypeWeekAndDay(
                        evaluatedCurrentProgram,
                        exercise.exerciseType,
                        exercise.week,
                        exercise.dayInWeek
                      );
                      if (programExercise && programExercise.exerciseType) {
                        const nextHistoryEntry = Program.nextHistoryEntry(
                          evaluatedCurrentProgram,
                          Program.getDayData(evaluatedCurrentProgram, evaluatedCurrentProgram.nextDay),
                          { ...programExercise, exerciseType: exercise.exerciseType },
                          props.stats,
                          props.settings
                        );
                        if (exercisePickerState.entryIndex == null) {
                          updateProgress(
                            dispatch,
                            [
                              lb<IHistoryRecord>()
                                .p("entries")
                                .recordModify((entries) => [...entries, nextHistoryEntry]),
                            ],
                            "add-exercise"
                          );
                        } else {
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
                    [lb<IState>().p("progress").pi(progress.id).pi("ui").p("exercisePicker").record(undefined)],
                    "Close exercise picker"
                  );
                  setTimeout(() => {
                    setForceUpdateEntryIndex(!forceUpdateEntryIndex);
                    document
                      .querySelector(`[data-name=workout-exercise-tab-${progress.entries.length}]`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }, 0);
                }}
                exercisePicker={exercisePickerState}
                onChangeCustomExercise={(action, exercise) => {
                  Exercise.handleCustomExerciseChange(props.dispatch, action, exercise, props.settings, props.program);
                }}
                evaluatedProgram={evaluatedCurrentProgram}
                onStar={(key) => Settings.toggleStarredExercise(props.dispatch, key)}
                dispatch={buildExercisePickerDispatch(props.dispatch, progress.id)}
                onClose={() => {
                  updateState(
                    props.dispatch,
                    [lb<IState>().p("progress").pi(progress.id).pi("ui").p("exercisePicker").record(undefined)],
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
                progressId={progress.id}
                settings={props.settings}
                exercise={progress.ui?.equipmentModal.exerciseType}
                entries={progress.entries}
                dispatch={props.dispatch}
              />
            )}
            {progress.ui?.rm1Modal?.exerciseType && (
              <Modal1RM
                progressId={progress.id}
                settings={props.settings}
                exercise={progress.ui?.rm1Modal.exerciseType}
                dispatch={props.dispatch}
              />
            )}
            {!Progress.isCurrent(progress) &&
              ((SendMessage.isIos() && SendMessage.iosAppVersion() >= 11) ||
              (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 20) ? (
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
          forceUpdateEntryIndex={forceUpdateEntryIndex}
          setForceUpdateEntryIndex={() => setForceUpdateEntryIndex(!forceUpdateEntryIndex)}
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
