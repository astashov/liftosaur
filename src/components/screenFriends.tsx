import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { Button } from "./button";
import { IAllFriends, ILoading } from "../models/state";
import { FriendsList } from "./friendsList";
import { useEffect } from "preact/hooks";
import { GroupHeader } from "./groupHeader";

interface IProps {
  allFriends: IAllFriends;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ScreenFriends(props: IProps): JSX.Element {
  const userIds = props.allFriends.sortedIds.filter((id) => !!props.allFriends.friends[id]?.status);

  useEffect(() => {
    if (props.allFriends.sortedIds.length === 0 && !props.allFriends.isLoading) {
      props.dispatch(Thunk.fetchFriends(""));
    }
  }, []);

  return (
    <section className="h-full">
      <HeaderView title="Friends" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <div className="p-2 text-center">
          <Button kind="green" onClick={() => props.dispatch(Thunk.pushScreen("friendsAdd"))}>
            Add Friend
          </Button>
        </div>
        <GroupHeader name="Friends" />
        <FriendsList allFriends={props.allFriends} ids={userIds} dispatch={props.dispatch} />
      </section>
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
