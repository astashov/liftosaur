import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpMusclesDay(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Muscles Map - Day</Text>
      <Text className="pb-2 text-sm">
        Shows how much specific muscles are used in the current day. You may use it to find imbalances in your program.
      </Text>
      <Text className="pb-2 text-sm">
        We calculate usage for <Text className="text-sm font-bold">strength</Text> and{" "}
        <Text className="text-sm font-bold">hypertrophy</Text> separately. For{" "}
        <Text className="text-sm font-bold">strength</Text> we consider sets with reps {"<"} 8, for{" "}
        <Text className="text-sm font-bold">hypertrophy</Text> - sets with reps {">"}= 8.
      </Text>
      <Text className="pb-2 text-sm">
        In the <Text className="text-sm font-bold">Muscles used, relatively to each other</Text> section, for
        calculating percentages, we assume each{" "}
        <Text className="text-sm font-bold">target muscle is 3x of each synergist muscle</Text>, we combine all sets
        and reps, and then normalize by the most used muscle - it will be 100%. So all other muscles would be less
        than 100%.
      </Text>
      <Text className="pb-2 text-sm">
        In the <Text className="text-sm font-bold">List of exercises</Text> section, you could see the muscles for each
        exercise, split into target and synergist. It also shows the same numbers as above - how much each muscle is
        used in the day relatively to the top muscle.
      </Text>
    </View>
  );
}
