import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { MenuItemEditable } from "../../components/menuItemEditable";
import { Settings_changePickerSettings } from "../../models/settings";

export function NavModalExercisePickerSettings(): JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <View className="px-4 pb-4 bg-background-default">
      <Text className="pt-4 pb-3 text-base font-semibold text-center">Exercise Picker Settings</Text>
      <MenuItemEditable
        type="boolean"
        name="Keep existing program exercise logic when pick adhoc exercise"
        value={state.storage.settings.workoutSettings.shouldKeepProgramExerciseId ? "true" : "false"}
        onChange={(v) => {
          Settings_changePickerSettings(dispatch, { shouldKeepProgramExerciseId: v === "true" });
        }}
      />
    </View>
  );
}
