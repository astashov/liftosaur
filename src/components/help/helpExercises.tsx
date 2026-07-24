import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpExercises(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Settings - Exercises</Text>
      <Text className="pb-2 text-sm">
        You specify your available equipment here, and specifically - what plates and what fixed weights you have
        available.
      </Text>
    </View>
  );
}
