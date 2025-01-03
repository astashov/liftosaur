import { View } from "react-native";
import { LftText } from "../lftText";

export function HelpMeasurements(): JSX.Element {
  return (
    <View>
      <LftText className="pb-2 text-xl">Measurements</LftText>
      <LftText className="pb-2">
        Here you can track your <LftText className="font-bold">body measurements</LftText> - bodyweight, size of your
        biceps, shoulders, calfs, etc.
      </LftText>
      <LftText className="pb-2">
        Then, on the <LftText className="font-bold">"Graphs"</LftText> screen, you can see correlation of the
        measurement graphs and the workout graphs, and see how the lifted weights and body measurements correlate.
      </LftText>
      <LftText className="pb-2">
        To see specific data points, pick the measurement <LftText className="font-bold">Type</LftText> at the top of
        the screen.
      </LftText>
      <LftText className="pb-2">If you have more than 3 data points, you'll also see the graph.</LftText>
      <LftText className="pb-2">
        You can edit and remove the data points below the graph, and you can add new data points by clicking on a button
        in the footer.
      </LftText>
    </View>
  );
}
