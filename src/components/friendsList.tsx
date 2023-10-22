import { IAllFriends, IFriend } from "../models/state";
import { Fragment, h, JSX } from "preact";
import { MenuItemWrapper } from "./menuItem";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IconSpinner } from "./icons/iconSpinner";

export interface IFriendsListProps {
  ids: string[];
  allFriends: IAllFriends;
  dispatch: IDispatch;
  onAdd?: (friendId: string) => void;
}

export function FriendsList(props: IFriendsListProps): JSX.Element {
  const { ids, allFriends } = props;
  if (props.allFriends.isLoading) {
    return (
      <div className="p-6 text-center">
        <IconSpinner height={30} width={30} />
      </div>
    );
  }

  if (!props.allFriends.isLoading && props.ids.length === 0) {
    return <div className="p-6 text-center">You have no friends yet</div>;
  }

  return (
    <Fragment>
      {ids.map((userId) => {
        const friend = allFriends.friends[userId];
        if (!friend) {
          return null;
        }
        const { nickname, id } = friend.user;

        return (
          <MenuItemWrapper name={nickname || id}>
            <div className="flex items-center">
              <div className="flex-1">
                {nickname ? (
                  <div className="py-2 pr-2">
                    <div className="">{nickname}</div>
                    <div className="text-xs italic text-gray-500">id: {id}</div>
                  </div>
                ) : (
                  <div className="py-2 pr-2 italic text-gray-500">id: {id}</div>
                )}
              </div>
              <div className="p-1">
                <StatusButton onAdd={props.onAdd} dispatch={props.dispatch} friend={friend} />
              </div>
            </div>
          </MenuItemWrapper>
        );
      })}
    </Fragment>
  );
}

interface IStatusButtonProps {
  dispatch: IDispatch;
  friend: IFriend;
  onAdd?: (friendId: string) => void;
}

function StatusButton(props: IStatusButtonProps): JSX.Element {
  const { friend, dispatch } = props;
  if (friend.status === "active") {
    return (
      <div className="text-right">
        <button
          className="italic text-blue-700 underline bg-transparent border-none nm-remove-friend"
          data-cy="button-friend-remove"
          onClick={() => dispatch(Thunk.removeFriend(friend.user.id))}
        >
          Remove
        </button>
        <div className="text-sm italic text-gray-600">Added</div>
      </div>
    );
  } else if (friend.status === "invited") {
    return (
      <div className="text-right">
        <button
          className="italic text-blue-700 underline bg-transparent border-none"
          onClick={() => dispatch(Thunk.inviteFriend(friend.user.id, ""))}
          data-cy="button-friend-resend-invitation"
        >
          Resend invitation
        </button>
        <div className="text-sm italic text-gray-600">Invited</div>
      </div>
    );
  } else if (friend.status === "pending") {
    return (
      <span>
        <button
          className="italic text-blue-700 underline bg-transparent border-none"
          onClick={() => dispatch(Thunk.acceptFriendshipInvitation(friend.user.id))}
          data-cy="button-friend-accept-invitation"
        >
          Accept invitation
        </button>
      </span>
    );
  } else if (friend.status === "loading") {
    return <IconSpinner width={20} height={20} />;
  } else {
    return (
      <button
        className="italic text-blue-700 underline bg-transparent border-none"
        onClick={() => props.onAdd && props.onAdd(friend.user.id)}
        data-cy="button-friend-add"
      >
        Add
      </button>
    );
  }
}
