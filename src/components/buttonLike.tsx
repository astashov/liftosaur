import { h, JSX } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IAllLikes } from "../models/state";
import { IconHeart } from "./icons/iconHeart";

interface IProps {
  dispatch: IDispatch;
  userId?: string;
  friendId?: string;
  historyRecordId: number;
  likes?: IAllLikes;
}

export function ButtonLike(props: IProps): JSX.Element | null {
  const { dispatch, friendId, userId, historyRecordId, likes } = props;
  const key = friendId || userId ? `${friendId || userId}_${historyRecordId}` : undefined;
  const numberOfLikes = key ? likes?.likes[key]?.length || 0 : 0;
  if (friendId != null || numberOfLikes > 0) {
    return (
      <button
        className={`button pr-2 ${numberOfLikes === 0 ? "unliked" : "liked"}`}
        data-cy="like"
        onClick={() => {
          if (friendId != null) {
            dispatch(Thunk.like(friendId, historyRecordId));
          }
        }}
      >
        <IconHeart
          strokeColor={numberOfLikes === 0 ? "#e53e3e" : undefined}
          fillColor={numberOfLikes > 0 ? "#e53e3e" : undefined}
        />
        {numberOfLikes > 0 ? <span className="ml-1">{numberOfLikes}</span> : null}
      </button>
    );
  } else {
    return null;
  }
}
