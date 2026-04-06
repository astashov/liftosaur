import React from "react";
import { View, Text } from "react-native";

export function NavScreenProgress(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Workout</Text>
      <Text className="text-sm text-icon-neutralsubtle mt-1">Active workout progress</Text>
    </View>
  );
}

export function NavScreenFinishDay(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Finish Day</Text>
    </View>
  );
}

export function NavScreenSubscription(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Subscription</Text>
    </View>
  );
}
