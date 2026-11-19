import type { JSX } from "react";
import { Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IWeightDeviation } from "../models/weightDeviation";
import { Weight_display } from "../models/weight";

export function WeightDeviationLine(props: { deviation: IWeightDeviation; onPress: () => void }): JSX.Element {
  const { completedWeight, targetWeight } = props.deviation;
  return (
    <Pressable
      className="flex-row justify-end pb-2 pr-4"
      onPress={props.onPress}
      testID="weight-deviation-update-program"
      data-testid="weight-deviation-update-program"
    >
      <Text className="text-xs text-text-secondary">
        {Weight_display(completedWeight)} instead of {Weight_display(targetWeight)} ·{" "}
      </Text>
      <Text className="text-xs font-semibold text-text-link">Update program…</Text>
    </Pressable>
  );
}
