import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IAllFriends, ILoading } from "../models/state";
import { useEffect, useState } from "preact/hooks";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { FriendsList } from "./friendsList";
import { ModalAddFriend } from "./modalAddFriend";

interface IProps {
  dispatch: IDispatch;
  allFriends: IAllFriends;
  loading: ILoading;
}

export function ScreenFriendsAdd(props: IProps): JSX.Element {
  const [prefix, setPrefix] = useState("");
  const [friendId, setFriendId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (props.allFriends.sortedIds.length === 0 && !props.allFriends.isLoading) {
      props.dispatch(Thunk.fetchFriends(""));
    }
  }, []);

  const ids = props.allFriends.sortedIds.filter((id) => {
    const user = props.allFriends.friends[id]?.user;
    return (
      (user?.id && user.id.toLowerCase().indexOf(prefix.toLowerCase()) !== -1) ||
      (user?.nickname && user.nickname?.toLowerCase().indexOf(prefix.toLowerCase()) !== -1)
    );
  });

  return (
    <section className="h-full">
      <HeaderView title="Add Friend" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <GroupHeader name="Filter" />
        <div className="p-1">
          <input
            data-cy="add-friend-filter"
            className={inputClassName}
            type="text"
            placeholder="Usernames beginning with..."
            onInput={(e) => {
              setPrefix(e.currentTarget.value);
            }}
          />
        </div>
        <GroupHeader name="Users List" />
        <FriendsList onAdd={(f) => setFriendId(f)} allFriends={props.allFriends} ids={ids} dispatch={props.dispatch} />
      </section>
      <ModalAddFriend
        isHidden={friendId == null}
        onAdd={(message) => {
          if (friendId != null) {
            props.dispatch(Thunk.inviteFriend(friendId, message));
            setFriendId(undefined);
          }
        }}
        onCancel={() => setFriendId(undefined)}
      />
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
