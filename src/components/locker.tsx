import React, { JSX } from "react";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Subscriptions } from "../utils/subscriptions";
import { Thunk } from "../ducks/thunks";
import { ISubscription } from "../types";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  topic: string;
  blur: number;
}

export function Locker(props: IProps): JSX.Element {
  const isSubscribed = Subscriptions.hasSubscription(props.subscription);

  if (isSubscribed) {
    return <></>;
  }
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center"
      style={{ backdropFilter: `blur(${props.blur}px)`, WebkitBackdropFilter: `blur(${props.blur}px)` }}
    >
      <div className="mx-auto text-center" style={{ maxWidth: "12rem" }}>
        Get <span className="font-bold text-orangev2">Premium</span> to unlock <strong>{props.topic}</strong>
      </div>
      <div className="pt-1 text-center">
        <Button name="unlock" kind="orange" onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}>
          Unlock
        </Button>
      </div>
    </div>
  );
}
