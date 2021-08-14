import { h, JSX } from "preact";
import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { Timer } from "./timer";
import { memo } from "preact/compat";
import { IHistoryRecord, IProgram, ISettings, IProgressMode, IProgramExercise } from "../types";
import { IAllComments, IAllFriends, IAllLikes, IFriendUser } from "../models/state";
import { Comments } from "./comments";

interface ICardsViewProps {
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  program?: IProgram;
  friend?: IFriendUser;
  userId?: string;
  friends: IAllFriends;
  nickname?: string;
  comments: IAllComments;
  likes: IAllLikes;
  isTimerShown: boolean;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
  onStartSetChanging?: (isWarmup: boolean, entryIndex: number, setIndex?: number) => void;
}

export const CardsView = memo(
  (props: ICardsViewProps): JSX.Element => {
    const { friend, userId } = props;
    return (
      <section style={{ paddingTop: "3.5rem", paddingBottom: props.isTimerShown ? "7.5rem" : "4rem" }}>
        <div className="flex">
          <div className="px-3 py-1 italic">{friend?.nickname}</div>
          <div className="flex-1">
            {!friend && Progress.isCurrent(props.progress) && <Timer startTime={props.progress.startTime} />}
          </div>
        </div>
        {props.progress.entries.map((entry, index) => {
          let programExercise: IProgramExercise | undefined;
          if (props.program) {
            const exerciseId = props.program.days[props.progress.day - 1].exercises[index].id;
            programExercise = props.program.exercises.find((e) => e.id === exerciseId);
          }

          return (
            <ExerciseView
              history={props.history}
              showHelp={true}
              isCurrent={Progress.isCurrent(props.progress)}
              friend={friend}
              settings={props.settings}
              index={index}
              entry={entry}
              programExercise={programExercise}
              day={props.progress.day}
              dispatch={props.dispatch}
              onChangeReps={props.onChangeReps}
              onStartSetChanging={props.onStartSetChanging}
            />
          );
        })}
        {!Progress.isCurrent(props.progress) && userId && (
          <Comments
            nickname={props.nickname}
            currentUserId={userId}
            friends={props.friends}
            likes={props.likes}
            historyRecordId={props.progress.id}
            friendId={friend?.id}
            comments={props.comments}
            dispatch={props.dispatch}
          />
        )}
        {!friend && (
          <div className="pt-1 pb-3 text-center">
            <Button
              kind="green"
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
              {Progress.isCurrent(props.progress) ? "Finish the workout" : "Save"}
            </Button>
          </div>
        )}
      </section>
    );
  }
);
