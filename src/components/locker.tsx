import { JSX, memo } from "react";
import { View, Platform } from "react-native";
import { Text } from "./primitives/text";
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

function LockerInner(props: IProps): JSX.Element {
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);

  if (isSubscribed) {
    return <></>;
  }
  return (
    <View
      className="absolute inset-0 z-10 flex-col items-center justify-center"
      style={Platform.select({
        ios: { backgroundColor: `rgba(255,255,255,0.7)` },
        android: { backgroundColor: `rgba(255,255,255,0.85)` },
        default: { backdropFilter: `blur(${props.blur}px)`, WebkitBackdropFilter: `blur(${props.blur}px)` },
      })}
    >
      <View className="mx-auto text-center" style={{ maxWidth: 192 }}>
        <Text>
          Get <Text className="font-bold text-icon-yellow">Premium</Text> to unlock{" "}
          <Text className="font-bold">{props.topic}</Text>
        </Text>
      </View>
      <View className="pt-1 items-center">
        <Button name="unlock" kind="purple" onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}>
          Unlock
        </Button>
      </View>
    </View>
  );
}

export const Locker = memo(LockerInner);
