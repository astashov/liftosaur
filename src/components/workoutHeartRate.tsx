import { JSX, useContext, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IconHeart } from "./icons/iconHeart";
import { AppContext } from "./appContext";
import { IHeartRateStore } from "../utils/heartRateStore";
import { Tailwind_semantic } from "../utils/tailwindConfig";

export function WorkoutHeartRate(): JSX.Element | null {
  const store = useContext(AppContext).heartRate;
  return store != null ? <WorkoutHeartRateValue store={store} /> : null;
}

function WorkoutHeartRateValue(props: { store: IHeartRateStore }): JSX.Element | null {
  const bpm = useSyncExternalStore(props.store.subscribe, props.store.getBpm);
  if (bpm == null) {
    return null;
  }
  return (
    <View className="flex-row items-center ml-3" testID="workout-heart-rate">
      <IconHeart size={14} color={Tailwind_semantic().icon.red} />
      <Text className="ml-1 text-sm font-semibold">{bpm}</Text>
    </View>
  );
}
