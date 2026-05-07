import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IconFilter } from "../icons/iconFilter";

export function HelpExerciseStats(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Exercise Stats</Text>
      <Text className="pb-2 text-sm">
        All the information about specific exercise is collected on this screen. Progress graph, your personal records,
        and history of the exercise.
      </Text>
      <Text className="pb-2 text-sm">You can switch between exercises via a selector at the top of the screen.</Text>
      <Text className="pb-2 text-sm">
        If you tap on the personal records or on history records, you'll navigate to the workout where that happened.
      </Text>
      <View className="flex-row flex-wrap items-center pb-2">
        <Text className="text-sm">You can sort/filter the history, by tapping on the </Text>
        <IconFilter size={14} />
        <Text className="text-sm"> at the history header, e.g. sort by date ascending or descending.</Text>
      </View>
    </View>
  );
}
