import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { Progress } from "../models/progress";
import { History } from "../models/history";
import { ModalDate } from "./modalDate";
import { INavCommon, IState, updateSettings, updateState } from "../models/state";
import { useState } from "preact/hooks";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IHistoryRecord, IProgram, ISettings, IProgressMode, ISubscription, IExerciseType } from "../types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IconTrash } from "./icons/iconTrash";
import { Timer } from "./timer";
import { BottomSheetEditExercise } from "./bottomSheetEditExercise";
import { HelpWorkout } from "./help/helpWorkout";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { ModalEditMode } from "./modalEditMode";
import { ModalExercise } from "./modalExercise";
import { EditCustomExercise } from "../models/editCustomExercise";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { ModalEquipment } from "./modalEquipment";
import { Modal1RM } from "./modal1RM";
import { BottomSheetMobileShareOptions } from "./bottomSheetMobileShareOptions";
import { SendMessage } from "../utils/sendMessage";
import { BottomSheetWebappShareOptions } from "./bottomSheetWebappShareOptions";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { Exercise } from "../models/exercise";
import { EditProgram } from "../models/editProgram";

interface IProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  settings: ISettings;
  userId?: string;
  helps: string[];
  dispatch: IDispatch;
  subscription: ISubscription;
  timerSince?: number;
  timerMode?: IProgressMode;
  navCommon: INavCommon;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const evaluatedProgram = props.program ? Program.evaluate(props.program, props.settings) : undefined;
  const dispatch = props.dispatch;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const editModalProgramExerciseId = progress.ui?.editModal?.programExerciseId;
  const dateModal = progress.ui?.dateModal;
  const programDay = evaluatedProgram ? Program.getProgramDay(evaluatedProgram, progress.day) : undefined;

  if (progress != null) {
    return (
      <Surface
        navbar={
          <NavbarView
            navCommon={props.navCommon}
            dispatch={dispatch}
            helpContent={<HelpWorkout />}
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
                className="p-2 nm-delete-progress ls-delete-progress"
                onClick={() => {
                  if (confirm("Are you sure?")) {
                    props.dispatch({ type: "DeleteProgress" });
                  }
                }}
              >
                <IconTrash />
              </button>,
            ]}
          />
        }
        footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
        addons={
          <>
            <BottomSheetEditExercise
              progress={props.progress}
              isHidden={progress.ui?.exerciseBottomSheet == null}
              dispatch={props.dispatch}
            />
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
                onDone={() => {
                  const amrapModal = progress.ui?.amrapModal;
                  if (amrapModal != null) {
                    maybeStartTimer("workout", amrapModal.entryIndex, amrapModal.setIndex, dispatch);
                  }
                }}
              />
            )}
            {progress.ui?.weightModal && (
              <ModalWeight
                programExercise={Program.getProgramExercise(
                  progress.day,
                  evaluatedProgram,
                  progress.ui?.weightModal?.programExerciseId
                )}
                isHidden={progress.ui?.weightModal == null}
                settings={props.settings}
                dispatch={props.dispatch}
                weight={progress.ui?.weightModal?.weight ?? 0}
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
                      Progress.addExercise(props.dispatch, props.progress.id, exerciseType);
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
            {progress.ui?.editSetModal && (
              <ModalEditSet
                isHidden={progress.ui?.editSetModal == null}
                setsLength={progress.entries[progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
                subscription={props.subscription}
                progressId={progress.id}
                dispatch={props.dispatch}
                settings={props.settings}
                exerciseType={progress.ui?.editSetModal?.exerciseType}
                programExercise={Program.getProgramExercise(
                  progress.day,
                  evaluatedProgram,
                  progress.ui?.editSetModal?.programExerciseId
                )}
                set={EditProgressEntry.getEditSetData(props.progress)}
                isWarmup={progress.ui?.editSetModal?.isWarmup || false}
                entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
                setIndex={progress.ui?.editSetModal?.setIndex}
              />
            )}
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
        <CardsView
          subscription={props.subscription}
          history={props.history}
          helps={props.helps}
          settings={props.settings}
          program={evaluatedProgram}
          programDay={programDay}
          userId={props.userId}
          progress={progress}
          isTimerShown={!!props.timerSince}
          dispatch={props.dispatch}
          setIsShareShown={setIsShareShown}
          onChangeReps={(mode, entryIndex, setIndex) => {
            const isAmrapSet =
              mode === "workout" &&
              (!!progress.entries[entryIndex]?.sets[setIndex]?.isAmrap ||
                !!progress.entries[entryIndex]?.sets[setIndex]?.logRpe);
            if (!isAmrapSet) {
              maybeStartTimer(mode, entryIndex, setIndex, dispatch);
            }
          }}
          onStartSetChanging={(
            isWarmup: boolean,
            entryIndex: number,
            setIndex?: number,
            programExercise?: IPlannerProgramExercise,
            exerciseType?: IExerciseType
          ) => {
            EditProgressEntry.showEditSetModal(
              props.dispatch,
              isWarmup,
              entryIndex,
              setIndex,
              programExercise,
              exerciseType
            );
          }}
        />
      </Surface>
    );
  } else {
    return null;
  }
}

function maybeStartTimer(mode: "warmup" | "workout", entryIndex: number, setIndex: number, dispatch: IDispatch): void {
  dispatch({
    type: "StartTimer",
    timestamp: new Date().getTime(),
    mode,
    entryIndex,
    setIndex,
  });
}
