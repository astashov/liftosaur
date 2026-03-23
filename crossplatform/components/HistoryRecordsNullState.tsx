import React from "react";
import { View, Text, Image } from "react-native";
import { IconArrowDown3 } from "./icons/IconArrowDown3";

export function HistoryRecordsNullState(): React.ReactElement {
  return (
    <>
      <View className="absolute items-center justify-center left-0 right-0" style={{ top: 130 }}>
        <Image source={{ uri: "https://www.liftosaur.com/images/dinocoach.svg" }} style={{ width: 188, height: 240 }} />
      </View>
      <View className="absolute bottom-0 left-0 right-0 py-4 pb-20 items-center border border-border-cardpurple bg-background-cardpurple rounded-2xl">
        <Text className="py-2 font-semibold">Welcome to Liftosaur!</Text>
        <Text className="text-sm">Tap here to start a workout</Text>
        <View className="py-2">
          <IconArrowDown3 />
        </View>
      </View>
    </>
  );
}
