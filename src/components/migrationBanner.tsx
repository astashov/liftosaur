import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IProgram, ISettings } from "../types";

interface IMigrationBannerProps {
  client: Window["fetch"];
  program: IProgram;
  settings: ISettings;
}

export function MigrationBanner(_props: IMigrationBannerProps): JSX.Element {
  return (
    <View className="flex-col items-center px-8 py-4 mx-4 mb-4 bg-background-lighterror rounded-lg">
      <View>
        <Text className="text-text-error">This is an old-style program, that doesn't work anymore!</Text>
      </View>
    </View>
  );
}
