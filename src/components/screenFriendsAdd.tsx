import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IAllFriends, ILoading } from "../models/state";
import { useEffect, useState } from "preact/hooks";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { FriendsList } from "./friendsList";
import { ModalAddFriend } from "./modalAddFriend";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { IScreen, Screen } from "../models/screen";
import { HelpFriendsAdd } from "./help/helpFriendsAdd";

interface IProps {
  dispatch: IDispatch;
  allFriends: IAllFriends;
  loading: ILoading;
  screenStack: IScreen[];
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
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Add Friend"
          helpContent={<HelpFriendsAdd />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
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
      }
    >
      <section className="px-4">
        <GroupHeader name="Filter" />
        <div className="py-1">
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
    </Surface>
  );
}
