import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { Progress } from "../models/progress";
import { History } from "../models/history";
import { ModalDate } from "./modalDate";
import { ILoading, IState, updateState } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "react";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import {
  IHistoryRecord,
  IProgram,
  ISettings,
  IProgressMode,
  ISubscription,
  IProgramExercise,
  IExerciseType,
} from "../types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IconTrash } from "./icons/iconTrash";
import { Timer } from "./timer";
import { BottomSheetEditExercise } from "./bottomSheetEditExercise";
import { HelpWorkout } from "./help/helpWorkout";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { IScreen, Screen } from "../models/screen";
import { ModalEditMode } from "./modalEditMode";
import { ModalExercise } from "./modalExercise";
import { EditCustomExercise } from "../models/editCustomExercise";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { EditProgram } from "../models/editProgram";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { CollectionUtils } from "../utils/collection";
import { PlannerKey } from "../pages/planner/plannerKey";
import { ModalEquipment } from "./modalEquipment";
import { Modal1RM } from "./modal1RM";
import { TouchableOpacity } from "react-native";
import { LftText } from "./lftText";
import { AlertUtils } from "../utils/alert";

interface IProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  settings: ISettings;
  userId?: string;
  helps: string[];
  dispatch: IDispatch;
  loading: ILoading;
  subscription: ISubscription;
  timerSince?: number;
  timerMode?: IProgressMode;
  screenStack: IScreen[];
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const dispatch = props.dispatch;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const editModalProgramExercise = progress.ui?.editModal?.programExercise.id;
  const dateModal = progress.ui?.dateModal;
  const programDay = props.program ? Program.getProgramDay(props.program, progress.day) : undefined;

  if (progress != null) {
    return (
      <Surface
        navbar={
          <NavbarView
            loading={props.loading}
            dispatch={dispatch}
            screenStack={props.screenStack}
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
                <LftText className="text-xs font-bold">
                  {TimeUtils.formatHHMM(History.workoutTime(props.progress))}
                </LftText>
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
              <TouchableOpacity
                key={0}
                className="p-2 nm-delete-progress ls-delete-progress"
                onPress={() => {
                  if (confirm("Are you sure?")) {
                    props.dispatch({ type: "DeleteProgress" });
                  }
                }}
              >
                <IconTrash />
              </TouchableOpacity>,
            ]}
          />
        }
        footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
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
                programExercise={Program.getProgramExerciseFromEntry(
                  props.program?.exercises || [],
                  progress.entries[progress.ui?.amrapModal?.entryIndex || 0]
                )}
                allProgramExercises={props.program?.exercises || []}
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
                programExercise={progress.ui?.weightModal?.programExercise}
                isHidden={progress.ui?.weightModal == null}
                settings={props.settings}
                dispatch={props.dispatch}
                weight={progress.ui?.weightModal?.weight ?? 0}
              />
            )}
            {editModalProgramExercise && props.program && (
              <ModalEditMode
                program={props.program}
                programExerciseId={editModalProgramExercise}
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
                  EditCustomExercise.createOrUpdate(
                    props.dispatch,
                    name,
                    targetMuscles,
                    synergistMuscles,
                    types,
                    smallImageUrl,
                    largeImageUrl,
                    exercise
                  );
                }}
                onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
                onChange={(exerciseType, shouldClose) => {
                  if (exerciseType != null) {
                    if (progress.ui?.exerciseModal?.entryIndex == null) {
                      Progress.addExercise(props.dispatch, props.progress.id, exerciseType);
                    } else {
                      const entryIndex = progress.ui?.exerciseModal?.entryIndex;
                      const program = props.program;
                      if (program) {
                        AlertUtils.confirm("This will change it for the current workout. Change in the program too?", {
                          onYes: () => {
                            const programExercise = Program.getProgramExerciseFromEntry(
                              program.exercises || [],
                              progress.entries[entryIndex]
                            );
                            if (program && programExercise) {
                              if (program.planner) {
                                const newPlannerResult = PlannerProgram.replaceExercise(
                                  program.planner,
                                  PlannerKey.fromProgramExercise(programExercise, props.settings),
                                  exerciseType,
                                  props.settings
                                );
                                if (newPlannerResult.success) {
                                  const newProgram = Program.cleanPlannerProgram({
                                    ...program,
                                    planner: newPlannerResult.data,
                                  });
                                  updateState(props.dispatch, [
                                    lb<IState>()
                                      .p("storage")
                                      .p("programs")
                                      .recordModify((programs) => {
                                        return CollectionUtils.setBy(programs, "id", program.id, newProgram);
                                      }),
                                  ]);
                                } else {
                                  alert(newPlannerResult.error);
                                }
                              } else {
                                EditProgram.swapExercise(
                                  props.dispatch,
                                  props.settings,
                                  program.id,
                                  programExercise.id,
                                  programExercise.exerciseType,
                                  exerciseType
                                );
                              }
                            }
                          },
                          onNo: () => {
                            Progress.changeExercise(props.dispatch, props.progress.id, exerciseType, entryIndex);
                          },
                        });
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
                programExercise={progress.ui?.editSetModal?.programExercise}
                allProgramExercises={props.program?.exercises}
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
            {isShareShown && !Progress.isCurrent(progress) && props.userId != null && (
              <ModalShare userId={props.userId} id={progress.id} onClose={() => setIsShareShown(false)} />
            )}
          </>
        }
      >
        <CardsView
          subscription={props.subscription}
          history={props.history}
          helps={props.helps}
          settings={props.settings}
          program={props.program}
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
            programExercise?: IProgramExercise,
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
