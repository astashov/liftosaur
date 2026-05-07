import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IconFilter } from "../icons/iconFilter";
import { Link } from "../link";

export function HelpGraphs(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Graphs</Text>
      <Text className="pb-2 text-sm">
        Here you can see <Text className="text-sm font-bold">graphs of your exercises and measurements</Text> (like
        bodyweight, bicep size, etc).
      </Text>
      <View className="flex-row flex-wrap items-center pb-2">
        <Text className="text-sm">You can configure the list of graphs by tapping on the </Text>
        <IconFilter size={14} />
        <Text className="text-sm"> icon in the navbar. There, you can also enable the following options there:</Text>
      </View>
      <View className="pb-2">
        <View className="flex-row pb-1 ml-6">
          <Text className="text-sm">{"• "}</Text>
          <Text className="flex-1 text-sm">
            You can enable <Text className="text-sm font-bold">same range on X axis for all graphs</Text>. By default
            they start from the first date of the exercise/measurement, and finish at the last one. But if you want to
            see correlation between graphs, it's convenient to use the same scale, so there's an option for that.
          </Text>
        </View>
        <View className="flex-row pb-1 ml-6">
          <Text className="text-sm">{"• "}</Text>
          <Text className="flex-1 text-sm">
            You can add <Text className="text-sm font-bold">bodyweight overlay</Text> to the graphs, to see how your
            lifts were affected by your weight.
          </Text>
        </View>
        <View className="flex-row pb-1 ml-6">
          <Text className="text-sm">{"• "}</Text>
          <Text className="flex-1 text-sm">
            And you can add <Text className="text-sm font-bold">1RM overlay</Text> (One Rep Max - the max weight you can
            lift for one rep) to the graphs. It tries to predict what would be your 1RM based on how much weight and
            how many reps you did, using{" "}
            <Link className="text-sm" href="https://en.wikipedia.org/wiki/One-repetition_maximum">
              Epley formula
            </Link>
            . It's a good way to track progress in your lifts, when you have different reps and weights in sets.
          </Text>
        </View>
      </View>
      <Text className="pb-2 text-sm">
        If you move your finger over graphs, you could see the date and the value at that point.
      </Text>
    </View>
  );
}
