import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { Button } from "./button";
import { IAllFriends, ILoading } from "../models/state";
import { FriendsList } from "./friendsList";
import { useEffect } from "preact/hooks";
import { GroupHeader } from "./groupHeader";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { HelpFriends } from "./help/helpFriends";

interface IProps {
  allFriends: IAllFriends;
  loading: ILoading;
  dispatch: IDispatch;
  screenStack: IScreen[];
}

export function ScreenFriends(props: IProps): JSX.Element {
  const userIds = props.allFriends.sortedIds.filter((id) => !!props.allFriends.friends[id]?.status);

  useEffect(() => {
    if (props.allFriends.sortedIds.length === 0 && !props.allFriends.isLoading) {
      props.dispatch(Thunk.fetchFriends(""));
    }
  }, []);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Friends"
          helpContent={<HelpFriends />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-4">
        <div className="p-2 text-center">
          <Button kind="orange" onClick={() => props.dispatch(Thunk.pushScreen("friendsAdd"))}>
            Add Friend
          </Button>
        </div>
        <GroupHeader name="Friends" />
        <FriendsList allFriends={props.allFriends} ids={userIds} dispatch={props.dispatch} />
      </section>
    </Surface>
  );
}
