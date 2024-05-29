import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { IAllComments, IAllFriends, IAllLikes, IFriendUser, ILoading, IState, updateState } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import {
  IHistoryRecord,
  IProgram,
  ISettings,
  IProgressMode,
  ISubscription,
  IProgramExercise,
  IEquipment,
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
import { PlannerToProgram } from "../models/plannerToProgram";
import { PlannerKey } from "../pages/planner/plannerKey";

interface IProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  settings: ISettings;
  friends: IAllFriends;
  userId?: string;
  helps: string[];
  dispatch: IDispatch;
  loading: ILoading;
  subscription: ISubscription;
  friend?: IFriendUser;
  comments: IAllComments;
  likes: IAllLikes;
  nickname?: string;
  timerSince?: number;
  timerMode?: IProgressMode;
  screenStack: IScreen[];
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const friend = props.friend;
  const dispatch = props.dispatch;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const editModalProgramExercise = progress.ui?.editModal?.programExercise.id;

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
              if (!friend && !Progress.isCurrent(progress)) {
                props.dispatch({ type: "ChangeDate", date: progress.date });
              }
            }}
            title={Progress.isCurrent(progress) ? "Ongoing workout" : DateUtils.format(progress.date)}
            subtitle={
              !Progress.isCurrent(progress) && progress.endTime ? (
                TimeUtils.formatHHMM(progress.endTime - props.progress.startTime)
              ) : (
                <Timer startTime={props.progress.startTime} />
              )
            }
            rightButtons={[
              ...(friend
                ? []
                : [
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
                  ]),
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
            <ModalDate
              isHidden={progress.ui?.dateModal == null}
              dispatch={props.dispatch}
              date={progress.ui?.dateModal?.date ?? ""}
            />
            {progress.ui?.exerciseModal != null && (
              <ModalExercise
                isHidden={progress.ui?.exerciseModal == null}
                exerciseType={progress.ui?.exerciseModal?.exerciseType}
                settings={props.settings}
                onCreateOrUpdate={(shouldClose, name, targetMuscles, synergistMuscles, types, exercise) => {
                  EditCustomExercise.createOrUpdate(
                    props.dispatch,
                    name,
                    targetMuscles,
                    synergistMuscles,
                    types,
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
                      if (
                        program &&
                        confirm("This will change it for the current workout. Change in the program too?")
                      ) {
                        const programExercise = Program.getProgramExerciseFromEntry(
                          program.exercises || [],
                          progress.entries[entryIndex]
                        );
                        if (program && programExercise) {
                          if (program.planner) {
                            const newPlanner = PlannerProgram.replaceExercise(
                              program.planner,
                              PlannerKey.fromProgramExercise(programExercise, props.settings),
                              exerciseType,
                              props.settings
                            );
                            const newProgram = new PlannerToProgram(
                              program.id,
                              program.nextDay,
                              program.exercises,
                              newPlanner,
                              props.settings
                            ).convertToProgram();
                            updateState(props.dispatch, [
                              lb<IState>()
                                .p("storage")
                                .p("programs")
                                .recordModify((programs) => {
                                  return CollectionUtils.setBy(programs, "id", program.id, newProgram);
                                }),
                            ]);
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
                equipment={progress.ui?.editSetModal?.equipment}
                programExercise={progress.ui?.editSetModal?.programExercise}
                allProgramExercises={props.program?.exercises}
                set={EditProgressEntry.getEditSetData(props.progress)}
                isWarmup={progress.ui?.editSetModal?.isWarmup || false}
                entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
                setIndex={progress.ui?.editSetModal?.setIndex}
              />
            )}
            {isShareShown && !friend && !Progress.isCurrent(progress) && props.userId != null && (
              <ModalShare userId={props.userId} id={progress.id} onClose={() => setIsShareShown(false)} />
            )}
          </>
        }
      >
        <CardsView
          friends={props.friends}
          subscription={props.subscription}
          nickname={props.nickname}
          history={props.history}
          helps={props.helps}
          settings={props.settings}
          program={props.program}
          friend={props.friend}
          userId={props.userId}
          comments={props.comments}
          likes={props.likes}
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
            equipment?: IEquipment
          ) => {
            EditProgressEntry.showEditSetModal(
              props.dispatch,
              isWarmup,
              entryIndex,
              setIndex,
              programExercise,
              equipment
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
