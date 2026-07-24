import { JSX, memo } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { ISubscription } from "../types";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";

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
  const isDark = Tailwind_semantic().background.default === Tailwind_colors().black;
  return (
    <View className="absolute inset-0 z-10 flex-col items-center justify-center overflow-hidden">
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? "dark" : "light"}
        blurAmount={props.blur}
        reducedTransparencyFallbackColor={Platform.OS === "ios" ? (isDark ? "black" : "white") : undefined}
        overlayColor={Platform.OS === "android" ? (isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)") : undefined}
      />
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
