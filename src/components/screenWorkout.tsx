import { h, JSX, Fragment } from "preact";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { useState } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { History } from "../models/history";
import { Progress } from "../models/progress";
import { INavCommon, IState, updateSettings, updateState } from "../models/state";
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
import { ModalEditMode } from "./modalEditMode";
import { ModalDate } from "./modalDate";
import { ModalExercise } from "./modalExercise";
import { Exercise } from "../models/exercise";
import { EditProgram } from "../models/editProgram";
import { EditCustomExercise } from "../models/editCustomExercise";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { lb } from "lens-shmens";
import { Modal1RM } from "./modal1RM";
import { ModalEquipment } from "./modalEquipment";
import { BottomSheetEditTarget } from "./bottomSheetEditTarget";
import { SendMessage } from "../utils/sendMessage";
import { BottomSheetMobileShareOptions } from "./bottomSheetMobileShareOptions";
import { BottomSheetWebappShareOptions } from "./bottomSheetWebappShareOptions";

interface IScreenWorkoutProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
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
  const evaluatedProgram = props.program ? Program.evaluate(props.program, props.settings) : undefined;
  const dispatch = props.dispatch;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const editModalProgramExerciseId = progress.ui?.editModal?.programExerciseId;
  const dateModal = progress.ui?.dateModal;
  const programDay = evaluatedProgram ? Program.getProgramDay(evaluatedProgram, progress.day) : undefined;
  const [forceUpdateEntryIndex, setForceUpdateEntryIndex] = useState(false);

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
                    props.dispatch({ type: "FinishProgramDayAction" });
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
            {editModalProgramExerciseId && evaluatedProgram && (
              <ModalEditMode
                program={evaluatedProgram}
                programExerciseId={editModalProgramExerciseId}
                entryIndex={progress.ui?.editModal?.entryIndex || 0}
                progressId={props.progress.id}
                day={props.progress.day}
                settings={props.settings}
                dispatch={props.dispatch}
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
            {progress.ui?.exerciseModal != null && (
              <ModalExercise
                isHidden={progress.ui?.exerciseModal == null}
                exerciseType={progress.ui?.exerciseModal?.exerciseType}
                settings={props.settings}
                onCreateOrUpdate={(
                  shouldClose,
                  name,
                  targetMuscles,
                  synergistMuscles,
                  types,
                  smallImageUrl,
                  largeImageUrl,
                  exercise
                ) => {
                  const exercises = Exercise.createOrUpdateCustomExercise(
                    props.settings.exercises,
                    name,
                    targetMuscles,
                    synergistMuscles,
                    types,
                    smallImageUrl,
                    largeImageUrl,
                    exercise
                  );
                  updateSettings(props.dispatch, lb<ISettings>().p("exercises").record(exercises));
                  if (props.program && exercise) {
                    const newProgram = Program.changeExerciseName(exercise.name, name, props.program, {
                      ...props.settings,
                      exercises,
                    });
                    EditProgram.updateProgram(props.dispatch, newProgram);
                  }
                }}
                onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
                onChange={(exerciseType, shouldClose) => {
                  if (exerciseType != null) {
                    if (progress.ui?.exerciseModal?.entryIndex == null) {
                      Progress.addExercise(props.dispatch, exerciseType, progress.entries.length);
                      setTimeout(() => {
                        setForceUpdateEntryIndex(!forceUpdateEntryIndex);
                        document
                          .querySelector(`[data-name=workout-exercise-tab-${progress.entries.length}]`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }, 0);
                    } else {
                      const entryIndex = progress.ui?.exerciseModal?.entryIndex;
                      const program = props.program;
                      if (
                        program &&
                        confirm("This will change it for the current workout. Change in the program too?")
                      ) {
                        const programExercise = Program.getProgramExercise(
                          progress.day,
                          evaluatedProgram,
                          progress.entries[entryIndex]?.programExerciseId
                        );
                        if (program && programExercise) {
                          const newEvaluatedProgram = PlannerProgram.replaceExercise(
                            program,
                            programExercise.key,
                            exerciseType,
                            props.settings
                          );
                          if (newEvaluatedProgram.success) {
                            updateState(props.dispatch, [
                              lb<IState>()
                                .p("storage")
                                .p("programs")
                                .findBy("id", program.id)
                                .record(newEvaluatedProgram.data),
                            ]);
                          } else {
                            alert(newEvaluatedProgram.error);
                          }
                        }
                      } else {
                        Progress.changeExercise(props.dispatch, props.progress.id, exerciseType, entryIndex);
                      }
                    }
                  }
                  if (shouldClose) {
                    updateState(props.dispatch, [
                      lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("exerciseModal").record(undefined),
                    ]);
                  }
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
