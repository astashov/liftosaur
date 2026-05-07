import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function HelpMeasurements(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Measurements</Text>
      <Text className="pb-2 text-sm">
        Here you can track your <Text className="text-sm font-bold">body measurements</Text> - bodyweight, size of your
        biceps, shoulders, calfs, etc.
      </Text>
      <Text className="pb-2 text-sm">
        Then, on the <Text className="text-sm font-bold">"Graphs"</Text> screen, you can see correlation of the
        measurement graphs and the workout graphs, and see how the lifted weights and body measurements correlate.
      </Text>
      <Text className="pb-2 text-sm">
        To see specific data points, pick the measurement <Text className="text-sm font-bold">Type</Text> at the top of
        the screen.
      </Text>
      <Text className="pb-2 text-sm">If you have more than 3 data points, you'll also see the graph.</Text>
      <Text className="pb-2 text-sm">
        You can edit and remove the data points below the graph, and you can add new data points by clicking on a
        button in the footer.
      </Text>
    </View>
  );
}
