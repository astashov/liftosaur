import { h, JSX, Fragment } from "preact";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { ISubscription } from "../types";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  topic: string;
  blur: number;
}

export function Locker(props: IProps): JSX.Element {
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);

  if (isSubscribed) {
    return <></>;
  }
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center"
      style={{ backdropFilter: `blur(${props.blur}px)`, WebkitBackdropFilter: `blur(${props.blur}px)` }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: "12rem" }}>
        Get <span className="font-bold text-icon-yellow">Premium</span> to unlock <strong>{props.topic}</strong>
      </div>
      <div className="pt-1 text-center">
        <Button name="unlock" kind="purple" onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}>
          Unlock
        </Button>
      </div>
    </div>
  );
}
