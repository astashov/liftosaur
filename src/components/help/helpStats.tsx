import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { IconFilter } from "../icons/iconFilter";

export function HelpStats(): JSX.Element {
  return (
    <View>
      <Text className="pb-2 text-xl font-semibold">Add Measurement</Text>
      <Text className="pb-2 text-sm">
        Here you enter your data points, what is your current bodyweight, calf size, bicep size, etc.
      </Text>
      <View className="flex-row flex-wrap items-center pb-2">
        <Text className="text-sm">
          You may track only the measurements you care about. You can setup the available input fields by clicking on
          the{" "}
        </Text>
        <IconFilter size={14} />
        <Text className="text-sm"> icon in the navbar.</Text>
      </View>
      <Text className="pb-2 text-sm">
        All fields are optional, if you skip them, those measurements just won't be added this time.
      </Text>
    </View>
  );
}
