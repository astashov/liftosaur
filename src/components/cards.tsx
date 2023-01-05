import { h, JSX } from "preact";
import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { memo } from "preact/compat";
import {
  IHistoryRecord,
  IProgram,
  ISettings,
  IProgressMode,
  IProgramExercise,
  IExerciseType,
  ISubscription,
} from "../types";
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
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
  onStartSetChanging?: (isWarmup: boolean, entryIndex: number, setIndex?: number) => void;
  onExerciseInfoClick?: (exercise: IExerciseType) => void;
  setIsShareShown: (isShown: boolean) => void;
}

export const CardsView = memo(
  (props: ICardsViewProps): JSX.Element => {
    const { friend, userId } = props;
    return (
      <section className="px-4">
        <div className="flex pb-2">
          <div className="flex-1">
            <div className="text-lg font-semibold">{props.progress?.programName}</div>
            <div className="text-sm text-grayv2-main">{props.progress?.dayName}</div>
          </div>
          {!friend && !Progress.isCurrent(props.progress) && (
            <div className="pt-1 pl-2">
              <Button
                className="ls-finish-day-share"
                kind="purple"
                onClick={() => {
                  if (props.userId == null) {
                    alert("You should be logged in to share workouts.");
                  } else {
                    props.setIsShareShown(true);
                  }
                }}
              >
                Share
              </Button>
            </div>
          )}
        </div>
        {friend?.nickname && <div className="px-3 py-1 italic">{friend?.nickname}</div>}
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
              showKebab={true}
              progress={props.progress}
              friend={friend}
              settings={props.settings}
              index={index}
              entry={entry}
              programExercise={programExercise}
              allProgramExercises={props.program?.exercises}
              subscription={props.subscription}
              day={props.progress.day}
              dispatch={props.dispatch}
              onChangeReps={props.onChangeReps}
              onExerciseInfoClick={props.onExerciseInfoClick}
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
              kind="orange"
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
