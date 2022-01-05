import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { RestTimer } from "./restTimer";
import { Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { IconEdit } from "./iconEdit";
import { IAllComments, IAllFriends, IAllLikes, IFriendUser, ILoading, IWebpushr } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";
import { IconShare } from "./iconShare";
import { IconMuscles } from "./iconMuscles";
import { Thunk } from "../ducks/thunks";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IHistoryRecord, IProgram, ISettings, IProgressMode, ISet } from "../types";

interface IProps {
  progress: IHistoryRecord;
  history: IHistoryRecord[];
  program?: IProgram;
  settings: ISettings;
  isChanged: boolean;
  friends: IAllFriends;
  userId?: string;
  dispatch: IDispatch;
  loading: ILoading;
  friend?: IFriendUser;
  comments: IAllComments;
  likes: IAllLikes;
  nickname?: string;
  timerSince?: number;
  timerMode?: IProgressMode;
  webpushr?: IWebpushr;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const friend = props.friend;
  const timers = props.settings.timers;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);

  if (progress != null) {
    return (
      <section className="relative h-full">
        <HeaderView
          title={
            <button
              onClick={() => {
                if (!friend && !Progress.isCurrent(progress)) {
                  props.dispatch({ type: "ChangeDate", date: progress.date });
                }
              }}
            >
              {DateUtils.format(progress.date)}
            </button>
          }
          subtitle={progress.programName}
          left={
            <button
              onClick={() => {
                if (!props.isChanged || Progress.isCurrent(progress) || confirm("Are you sure?")) {
                  props.dispatch({ type: "CancelProgress" });
                }
              }}
            >
              {friend || Progress.isCurrent(progress) ? "Back" : "Cancel"}
            </button>
          }
          right={
            !friend ? (
              <div className="px-3">
                <button
                  onClick={() => {
                    if (confirm("Are you sure?")) {
                      props.dispatch({ type: "DeleteProgress" });
                    }
                  }}
                >
                  {Progress.isCurrent(progress) ? "Cancel" : "Delete"}
                </button>
              </div>
            ) : undefined
          }
        />
        <CardsView
          friends={props.friends}
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
          onChangeReps={(mode) => {
            if (Progress.isCurrent(progress)) {
              props.dispatch({ type: "StartTimer", timestamp: new Date().getTime(), mode });
            }
          }}
          onStartSetChanging={(isWarmup: boolean, entryIndex: number, setIndex?: number) => {
            EditProgressEntry.showEditSetModal(props.dispatch, isWarmup, entryIndex, setIndex);
          }}
        />
        <RestTimer
          mode={props.timerMode ?? "workout"}
          timerStart={props.timerSince}
          webpushr={props.webpushr}
          timers={timers}
          dispatch={props.dispatch}
        />
        <FooterView
          dispatch={props.dispatch}
          loading={props.loading}
          buttons={
            !friend ? (
              <Fragment>
                <button
                  className="ls-footer-muscles p-4"
                  data-cy="footer-muscles"
                  aria-label="Muscles"
                  onClick={() => props.dispatch(Thunk.pushScreen("musclesDay"))}
                >
                  <IconMuscles />
                </button>
                {!Progress.isCurrent(props.progress) ? (
                  <button
                    className="ls-footer-share p-4"
                    onClick={() => {
                      if (props.userId == null) {
                        alert("You should be logged in to share workouts.");
                      } else {
                        setIsShareShown(true);
                      }
                    }}
                  >
                    <IconShare />
                  </button>
                ) : undefined}
                {Progress.isCurrent(props.progress) ? (
                  <button
                    className="ls-footer-edit-day p-4"
                    onClick={() => Progress.editDayAction(props.dispatch, progress.programId, progress.day - 1)}
                  >
                    <IconEdit size={24} lineColor="#A5B3BB" penColor="white" />
                  </button>
                ) : undefined}
              </Fragment>
            ) : undefined
          }
        />
        <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={props.dispatch} />
        <ModalWeight
          programExercise={progress.ui?.weightModal?.programExercise}
          isHidden={progress.ui?.weightModal == null}
          units={props.settings.units}
          dispatch={props.dispatch}
          weight={progress.ui?.weightModal?.weight ?? 0}
        />
        <ModalDate
          isHidden={progress.ui?.dateModal == null}
          dispatch={props.dispatch}
          date={progress.ui?.dateModal?.date ?? ""}
        />
        <ModalEditSet
          isHidden={progress.ui?.editSetModal == null}
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
      </section>
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
