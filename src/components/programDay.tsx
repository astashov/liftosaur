import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { IDispatch } from "../ducks/types";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { RestTimer } from "./restTimer";
import { Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import {
  IAllComments,
  IState,
  IAllFriends,
  IAllLikes,
  IFriendUser,
  ILoading,
  IWebpushr,
  updateState,
} from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";
import { Thunk } from "../ducks/thunks";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IHistoryRecord, IProgram, ISettings, IProgressMode, ISet } from "../types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconDoc } from "./icons/iconDoc";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconCog2 } from "./icons/iconCog2";
import { IconTrash } from "./icons/iconTrash";
import { Timer } from "./timer";
import { BottomSheetEditExercise } from "./bottomSheetEditExercise";
import { ModalHelpWorkout } from "./modalHelpWorkout";
import { lb } from "lens-shmens";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";

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
  screenStack: IScreen[];
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const friend = props.friend;
  const timers = props.settings.timers;
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
            onBack={() =>
              !props.isChanged || Progress.isCurrent(progress) || confirm("Are you sure? Changes won't be saved.")
            }
            onHelpClick={() => {
              updateState(props.dispatch, [
                lb<IState>().p("progress").pi(progress.id).pi("ui").p("showHelpModal").record(true),
              ]);
            }}
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
        footer={
          <Footer2View
            dispatch={props.dispatch}
            leftButtons={
              <>
                {Progress.isCurrent(props.progress) ? (
                  <FooterButton
                    icon={<IconDoc />}
                    text="Edit Day"
                    onClick={() => Progress.editDayAction(props.dispatch, progress.programId, progress.day - 1)}
                  />
                ) : null}
                <FooterButton
                  icon={<IconMuscles2 />}
                  onClick={() => dispatch(Thunk.pushScreen("musclesDay"))}
                  text="Muscles"
                />
              </>
            }
            rightButtons={
              <>
                <FooterButton
                  icon={<IconGraphs2 />}
                  text="Graphs"
                  onClick={() => dispatch(Thunk.pushScreen("graphs"))}
                />
                <FooterButton
                  icon={<IconCog2 />}
                  text="Settings"
                  onClick={() => dispatch(Thunk.pushScreen("settings"))}
                />
              </>
            }
            centerButtons={
              <RestTimer
                mode={props.timerMode ?? "workout"}
                timerStart={props.timerSince}
                webpushr={props.webpushr}
                timers={timers}
                dispatch={props.dispatch}
              />
            }
          />
        }
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
            <ModalHelpWorkout
              isHidden={!progress.ui?.showHelpModal}
              onClose={() => {
                updateState(props.dispatch, [
                  lb<IState>().p("progress").pi(progress.id).pi("ui").p("showHelpModal").record(undefined),
                ]);
              }}
            />
            {isShareShown && !friend && !Progress.isCurrent(progress) && props.userId != null && (
              <ModalShare userId={props.userId} id={progress.id} onClose={() => setIsShareShown(false)} />
            )}
          </>
        }
      >
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
