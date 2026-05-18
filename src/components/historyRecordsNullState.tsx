import type { JSX } from "react";
import { Platform, View } from "react-native";
import { SvgUri, SvgXml } from "./primitives/svg";
import { Text } from "./primitives/text";
import { IconArrowDown3 } from "./icons/iconArrowDown3";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { BundledImages_svgXml } from "../utils/bundledImages";

export function HistoryRecordsNullState(): JSX.Element {
  return (
    <View className="flex-1">
      <View className="items-center justify-center flex-1">
        {Platform.OS === "web" ? (
          <SvgUri uri={HostConfig_resolveUrl("/images/dinocoach.svg")} width={188} height={240} />
        ) : (
          <SvgXml xml={BundledImages_svgXml("/images/dinocoach.svg") ?? ""} width={188} height={240} />
        )}
      </View>
      <View className="items-center w-full py-4 border border-border-cardpurple bg-background-cardpurple rounded-tl-2xl rounded-se-2xl">
        <Text className="py-2 text-base font-semibold">Welcome to Liftosaur!</Text>
        <Text className="text-sm">Tap here to start a workout</Text>
        <View className="py-2">
          <IconArrowDown3 />
        </View>
      </View>
    </View>
  );
}
