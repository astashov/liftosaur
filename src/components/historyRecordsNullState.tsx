import type { JSX } from "react";
import { View, Image } from "react-native";
import { Text } from "./primitives/text";
import { IconArrowDown3 } from "./icons/iconArrowDown3";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

const dynocoachUri = HostConfig_resolveUrl("/images/dinocoach.svg");

export function HistoryRecordsNullState(): JSX.Element {
  return (
    <>
      <View className="items-center justify-center" style={{ marginTop: 30 }}>
        <Image source={{ uri: dynocoachUri }} style={{ width: 188, height: 240 }} />
      </View>
      <View className="w-full py-4 pb-20 items-center border border-border-cardpurple bg-background-cardpurple rounded-2xl mt-4">
        <Text className="py-2 font-semibold text-base">Welcome to Liftosaur!</Text>
        <Text className="text-sm">Tap here to start a workout</Text>
        <View className="py-2">
          <IconArrowDown3 />
        </View>
      </View>
    </>
  );
}
