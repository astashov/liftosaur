import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { IAllComments, IAllFriends, IAllLikes, IFriendUser, ILoading, IWebpushr } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IHistoryRecord, IProgram, ISettings, IProgressMode, ISet, ISubscription } from "../types";
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
            <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={props.dispatch} />
            <ModalWeight
              programExercise={progress.ui?.weightModal?.programExercise}
              isHidden={progress.ui?.weightModal == null}
              units={props.settings.units}
              dispatch={props.dispatch}
              weight={progress.ui?.weightModal?.weight ?? 0}
            />
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
            <ModalEditSet
              isHidden={progress.ui?.editSetModal == null}
              progressId={progress.id}
              dispatch={props.dispatch}
              units={props.settings.units}
              set={getEditSetData(props.progress)}
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
          onChangeReps={(mode, entry) => {
            let timer: number | undefined;
            if (Progress.isCurrent(progress)) {
              if (mode === "warmup") {
                timer = props.settings.timers[mode] || undefined;
              } else {
                timer = entry.timer || props.settings.timers[mode] || undefined;
              }
            }
            if (timer != null) {
              props.dispatch({
                type: "StartTimer",
                timestamp: new Date().getTime(),
                mode,
                timer,
              });
            }
          }}
          onStartSetChanging={(isWarmup: boolean, entryIndex: number, setIndex?: number) => {
            EditProgressEntry.showEditSetModal(props.dispatch, progress.id, isWarmup, entryIndex, setIndex);
          }}
        />
      </Surface>
    );
  } else {
    return null;
  }
}

function getEditSetData(progress: IHistoryRecord): ISet | undefined {
  const uiData = progress.ui?.editSetModal;
  if (uiData != null && uiData.setIndex != null) {
    const entry = progress.entries[uiData.entryIndex];
    if (entry != null) {
      const set = uiData.isWarmup ? entry.warmupSets[uiData.setIndex] : entry.sets[uiData.setIndex];
      return set;
    }
  }
  return undefined;
}
