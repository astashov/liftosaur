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
  ISubscription,
  IHistoryEntry,
  IEquipment,
} from "../types";
import { IAllComments, IAllFriends, IAllLikes, IFriendUser } from "../models/state";
import { Comments } from "./comments";
import { Thunk } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IconEditSquare } from "./icons/iconEditSquare";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { IconNotebook } from "./icons/iconNotebook";
import { LinkButton } from "./linkButton";

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
  onChangeReps: (mode: IProgressMode, entry: IHistoryEntry) => void;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    equipment?: IEquipment
  ) => void;
  setIsShareShown: (isShown: boolean) => void;
}

export const CardsView = memo(
  (props: ICardsViewProps): JSX.Element => {
    const { friend, userId } = props;
    return (
      <section className="px-4 pb-4">
        <div className="flex pb-2">
          <div className="flex-1">
            <div className="text-lg font-semibold">{props.progress?.programName}</div>
            <div className="flex text-sm text-grayv2-main">
              <div className="flex-1 mr-2 align-middle">{props.progress?.dayName}</div>
              <div className="mr-2 align-middle">
                <button
                  className="px-2 ml-1 align-middle"
                  onClick={() =>
                    Progress.editDayAction(props.dispatch, props.progress.programId, props.progress.day - 1)
                  }
                >
                  <IconEditSquare />
                </button>
                <button onClick={() => props.dispatch(Thunk.pushScreen("musclesDay"))} className="px-2 align-middle">
                  <IconMuscles2 />
                </button>
              </div>
            </div>
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
            programExercise = props.program.exercises.find((e) => e.id === entry.programExerciseId);
          }

          return (
            <ExerciseView
              history={props.history}
              showHelp={true}
              showEditButtons={true}
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
              onExerciseInfoClick={() => {
                props.dispatch(Thunk.pushExerciseStatsScreen(entry.exercise));
              }}
              onStartSetChanging={props.onStartSetChanging}
            />
          );
        })}
        <div style={{ marginTop: "-0.25rem" }} className="text-xs">
          <LinkButton
            data-cy="add-exercise-button"
            onClick={() => {
              Progress.showAddExerciseModal(props.dispatch, props.progress.id);
            }}
          >
            Add exercise (only to this workout)
          </LinkButton>
        </div>
        <div>
          <GroupHeader
            name="Notes"
            help={
              <div>
                Notes for the workout. You can also add notes per specific exercise by tapping{" "}
                <IconNotebook className="inline-block" /> for that exercise.
              </div>
            }
          />
          <textarea
            data-cy="workout-notes-input"
            id="workout-notes"
            maxLength={4095}
            name="workout-notes"
            placeholder="The workout went very well..."
            value={props.progress.notes}
            onInput={(e) => {
              const target = e.target;
              if (target instanceof HTMLTextAreaElement) {
                Progress.editNotes(props.dispatch, props.progress.id, target.value);
              }
            }}
            className={`${inputClassName} h-32`}
          />
        </div>
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
