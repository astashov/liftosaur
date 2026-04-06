import React from "react";
import { View, Text } from "react-native";

export function NavScreenFirst(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Welcome to Liftosaur</Text>
    </View>
  );
}

export function NavScreenUnits(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Choose Units</Text>
    </View>
  );
}

export function NavScreenSetupEquipment(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Setup Equipment</Text>
    </View>
  );
}

export function NavScreenSetupPlates(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Setup Plates</Text>
    </View>
  );
}

export function NavScreenProgramSelectOnboarding(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Select Program</Text>
    </View>
  );
}

export function NavScreenProgramsOnboarding(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Programs</Text>
    </View>
  );
}

export function NavScreenProgramPreviewOnboarding(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Program Preview</Text>
    </View>
  );
}
