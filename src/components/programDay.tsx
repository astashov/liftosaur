import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import {
  IAllComments,
  IAllFriends,
  IAllLikes,
  IFriendUser,
  ILoading,
  IState,
  IWebpushr,
  updateState,
} from "../models/state";
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
import { ModalStateVarsUserPrompt } from "./modalStateVarsUserPrompt";
import { ModalEditMode } from "./modalEditMode";
import { ModalExercise } from "./modalExercise";
import { EditCustomExercise } from "../models/editCustomExercise";
import { IExerciseId } from "../types";
import { lb } from "lens-shmens";

interface IProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  settings: ISettings;
  friends: IAllFriends;
  userId?: string;
  dispatch: IDispatch;
  loading: ILoading;
  subscription: ISubscription;
  friend?: IFriendUser;
  comments: IAllComments;
  likes: IAllLikes;
  nickname?: string;
  timerSince?: number;
  timerMode?: IProgressMode;
  webpushr?: IWebpushr;
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
                      className="p-2"
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
            <ModalAmrap
              isHidden={progress.ui?.amrapModal == null}
              dispatch={props.dispatch}
              onDone={() => {
                const amrapModal = progress.ui?.amrapModal;
                if (amrapModal != null) {
                  maybeStartTimer("workout", amrapModal.entryIndex, amrapModal.setIndex, dispatch);
                }
              }}
            />
            <ModalWeight
              programExercise={progress.ui?.weightModal?.programExercise}
              isHidden={progress.ui?.weightModal == null}
              units={props.settings.units}
              dispatch={props.dispatch}
              weight={progress.ui?.weightModal?.weight ?? 0}
            />
            {editModalProgramExercise && props.program && (
              <ModalEditMode
                program={props.program}
                programExerciseId={editModalProgramExercise}
                entryIndex={progress.ui?.editModal?.entryIndex || 0}
                progressId={props.progress.id}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            )}
            <ModalStateVarsUserPrompt
              programExercise={progress.ui?.stateVarsUserPromptModal?.programExercise}
              allProgramExercises={props.program?.exercises || []}
              isHidden={progress.ui?.stateVarsUserPromptModal?.programExercise == null}
              dispatch={props.dispatch}
            />
            <ModalDate
              isHidden={progress.ui?.dateModal == null}
              dispatch={props.dispatch}
              date={progress.ui?.dateModal?.date ?? ""}
            />
            <ModalExercise
              isHidden={progress.ui?.addExerciseModal == null}
              settings={props.settings}
              onCreateOrUpdate={(name, equipment, targetMuscles, synergistMuscles, exercise) => {
                EditCustomExercise.createOrUpdate(
                  props.dispatch,
                  name,
                  equipment,
                  targetMuscles,
                  synergistMuscles,
                  exercise
                );
              }}
              onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
              onChange={(id?: IExerciseId) => {
                if (id != null) {
                  Progress.addExercise(props.dispatch, props.progress.id, id, props.settings);
                }
                updateState(props.dispatch, [
                  lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("addExerciseModal").record(undefined),
                ]);
              }}
            />
            <ModalEditSet
              isHidden={progress.ui?.editSetModal == null}
              key={progress.ui?.editSetModal?.setIndex}
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
            const isAmrapSet = mode === "workout" && !!progress.entries[entryIndex]?.sets[setIndex]?.isAmrap;
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
