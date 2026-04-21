import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";

interface IPlannerGraphProps {
  title: string;
  yAxisLabel: string;
  color: string;
  height?: string;
  data: [number[], number[]];
}

export function PlannerGraph(props: IPlannerGraphProps): JSX.Element {
  return (
    <View className="items-center justify-center py-4">
      <Text className="text-xs text-text-secondary">{props.title} graph unavailable</Text>
    </View>
  );
}
