import { View } from "react-native";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Subscriptions } from "../utils/subscriptions";
import { Thunk } from "../ducks/thunks";
import { ISubscription } from "../types";
import { LftText } from "./lftText";
import { Blur } from "./blur";

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
    <Blur blur={props.blur}>
      <View className="mx-auto text-center" style={{ maxWidth: 192 }}>
        <LftText>
          Get <LftText className="font-bold text-orangev2">Premium</LftText> to unlock{" "}
          <LftText className="font-bold">{props.topic}</LftText>
        </LftText>
      </View>
      <View className="pt-1 text-center">
        <Button name="unlock" kind="orange" onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}>
          Unlock
        </Button>
      </View>
    </Blur>
  );
}
