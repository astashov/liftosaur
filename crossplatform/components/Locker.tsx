import type { JSX } from "react";
import { View, Text } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { ISubscription } from "@shared/types";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { Button } from "./Button";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  topic: string;
}

export function Locker(props: IProps): JSX.Element | null {
  if (Subscriptions_hasSubscription(props.subscription)) {
    return null;
  }
  const sem = Tailwind_semantic();
  return (
    <View
      className="absolute inset-0 z-10 items-center justify-center"
      style={{ backgroundColor: sem.background.default + "CC" }}
    >
      <View style={{ maxWidth: 192 }}>
        <Text className="text-center">
          Get <Text className="font-bold text-icon-yellow">Premium</Text> to unlock{" "}
          <Text className="font-bold">{props.topic}</Text>
        </Text>
      </View>
      <View className="mt-1">
        <Button
          name="unlock"
          kind="purple"
          buttonSize="md"
          onPress={() => props.dispatch(Thunk_pushScreen("subscription"))}
        >
          Unlock
        </Button>
      </View>
    </View>
  );
}
