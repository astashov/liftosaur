import React from "react";
import { View, Text } from "react-native";

export function NavScreenPrograms(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Programs</Text>
      <Text className="text-sm text-icon-neutralsubtle mt-1">Your training programs</Text>
    </View>
  );
}

export function NavScreenEditProgram(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Program</Text>
    </View>
  );
}

export function NavScreenEditProgramExercise(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Exercise</Text>
    </View>
  );
}

export function NavScreenMuscles(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Muscles</Text>
    </View>
  );
}

export function NavScreenOnerms(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">1 Rep Maxes</Text>
    </View>
  );
}

export function NavScreenProgramSelect(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Select Program</Text>
    </View>
  );
}

export function NavScreenProgramPreview(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Program Preview</Text>
    </View>
  );
}
