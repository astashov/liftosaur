import type { JSX } from "react";
import {
  FriendsWeb_listUrl,
  FriendsWeb_presentation,
  FriendsWeb_programsUrl,
  FriendsWeb_workoutsUrl,
  IFriendsPageData,
  IFriendsWebRow,
} from "../../models/friendsWeb";
import { FriendProgram_editorUrl, IFriendProgramCard } from "../../models/friendProgram";
import { ISettings } from "../../types";
import { ExerciseImageUtils_exists } from "../../models/exerciseImage";
import { ExerciseImage } from "../../components/exerciseImage";
import { RelativeTime_ago } from "../../utils/relativeTime";
import { FriendWorkoutsContent } from "./friendWorkoutsContent";
import { Avatar } from "../../components/social/avatar";

export type IFriendsContentProps = IFriendsPageData & { client: Window["fetch"] };

const pillClassName =
  "px-3 py-1 text-sm font-semibold rounded-full border border-border-cardpurple bg-background-default text-text-purple";

function FriendsList(props: { friends: IFriendsWebRow[]; now: number }): JSX.Element {
  if (props.friends.length === 0) {
    return (
      <p className="text-text-secondary" data-testid="friends-web-empty">
        You don't follow anyone yet. Invite a friend from the Friends screen in the Liftosaur app.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {props.friends.map((friend) => (
        <li
          key={friend.userId}
          className="flex gap-3 p-4 border rounded-2xl bg-background-cardpurple border-border-cardpurple"
          data-testid="friends-web-row"
        >
          <Avatar nickname={friend.nickname} size={48} />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{friend.name}</div>
            <div className="text-sm text-text-secondary">
              {friend.lastWorkoutAt != null
                ? `Trained ${RelativeTime_ago(friend.lastWorkoutAt, props.now)}`
                : "No workouts yet"}
            </div>
            {friend.currentProgramName != null && (
              <div className="text-sm truncate text-text-secondary" data-testid="friends-web-current-program">
                {`Running ${friend.currentProgramName}`}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <a className={pillClassName} href={FriendsWeb_workoutsUrl(friend.userId)}>
                Workouts
              </a>
              {friend.canEditPrograms && (
                <a
                  className={pillClassName}
                  href={FriendsWeb_programsUrl(friend.userId)}
                  data-testid="friends-web-programs"
                >
                  Programs
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FriendPrograms(props: { ownerId: string; programs: IFriendProgramCard[]; settings: ISettings }): JSX.Element {
  if (props.programs.length === 0) {
    return <p className="text-text-secondary">No programs yet.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {props.programs.map((program) => {
        const editorUrl = FriendProgram_editorUrl("", props.ownerId, program.id);
        return (
          <li
            key={program.id}
            className="p-4 border rounded-2xl bg-background-cardpurple border-border-cardpurple"
            data-testid="friends-web-program"
          >
            <div className="flex items-center gap-2">
              <a className="text-lg font-bold underline truncate text-text-link" href={editorUrl}>
                {program.name}
              </a>
              {program.isCurrent && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-background-purpledark text-text-purple">
                  Current
                </span>
              )}
            </div>
            <div className="flex flex-row flex-wrap pt-2">
              {program.exerciseTypes
                .filter((e) => ExerciseImageUtils_exists(e, "small"))
                .map((e) => (
                  <ExerciseImage
                    key={`${e.id}_${e.equipment}`}
                    settings={props.settings}
                    exerciseType={e}
                    size="small"
                    className="mr-1 w-scaled-6"
                  />
                ))}
            </div>
            <div className="pt-1 text-sm text-text-secondary">{program.summary}</div>
          </li>
        );
      })}
    </ul>
  );
}

export function FriendsContent(props: IFriendsContentProps): JSX.Element {
  const { heading } = FriendsWeb_presentation(props);
  return (
    <div className="px-4">
      {props.kind !== "list" && (
        <a className="text-sm underline text-text-link" href={FriendsWeb_listUrl()}>
          All friends
        </a>
      )}
      <h1 className="mt-2 mb-6 text-2xl font-bold">{heading}</h1>
      {props.kind === "list" && <FriendsList friends={props.friends} now={props.now} />}
      {props.kind === "programs" && (
        <FriendPrograms ownerId={props.ownerId} programs={props.programs} settings={props.settings} />
      )}
      {props.kind === "workouts" && <FriendWorkoutsContent {...props} />}
    </div>
  );
}
