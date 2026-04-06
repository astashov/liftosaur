import React from "react";
import { View, Text } from "react-native";

export function NavScreenGraphs(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Graphs</Text>
      <Text className="text-sm text-icon-neutralsubtle mt-1">Training progress charts</Text>
    </View>
  );
}
