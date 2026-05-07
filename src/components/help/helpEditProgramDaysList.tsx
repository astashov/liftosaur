import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IconCog2 } from "../icons/iconCog2";

export function HelpEditProgramDaysList(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Edit Program</Text>
      <Text className="pb-2 text-sm">
        A <Text className="text-sm font-bold">program</Text> consists of <Text className="text-sm font-bold">days</Text>
        , a <Text className="text-sm font-bold">day</Text> consists of{" "}
        <Text className="text-sm font-bold">exercises</Text>. Each exercise contains the sets, reps and logic for
        increasing/decreasing reps and weights.
      </Text>
      <Text className="pb-2 text-sm">
        At the top, below the program name, you <Text className="text-sm font-bold">choose a day</Text> for the next
        workout. You usually don't need to change it, it increments automatically after each workout, but you can force
        change it to another day if you want to skip or return to previous days for some reason.
      </Text>
      <Text className="pb-2 text-sm">
        Then, there's a list of days and a list of exercises. You can create those exercises and add them to days. You
        can copy days and exercises, sometimes it helps to speed up program creation/editing process.
      </Text>
      <Text className="pb-2 text-sm">You can reorder days, by dragging them by that 6-dot handle icon</Text>
      <Text className="pb-2 text-sm">
        Each exercise tracks its own state, like what's its current weight, or reps, or anything like that. You can
        reuse the same exercise between days, and it will update the state can copy days and exercises, sometimes it
        helps to speed up program creation/editing process.
      </Text>
      <View className="flex-row flex-wrap items-center pb-2">
        <Text className="text-sm">
          You can also export the currently editing program to a file, in case you want to edit it in your text editor
          (it's a JSON file), or you want to share with somebody. You can later on import it on the Setting screen
          (the{" "}
        </Text>
        <IconCog2 size={14} />
        <Text className="text-sm"> icon in the right bottom corner).</Text>
      </View>
    </View>
  );
}
