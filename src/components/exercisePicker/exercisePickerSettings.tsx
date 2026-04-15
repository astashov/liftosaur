import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IExercisePickerState, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IconBack } from "../icons/iconBack";
import { MenuItemEditable } from "../menuItemEditable";

export type IExercisePickerSettings = Pick<
  ISettings["workoutSettings"],
  "shouldKeepProgramExerciseId" | "pickerSort" | "shouldShowInvisibleEquipment"
>;

interface IProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  onChange: (settings: IExercisePickerSettings) => void;
}

export function ExercisePickerSettings(props: IProps): JSX.Element {
  return (
    <View className="flex-1 pb-4">
      <View className="flex-row items-center py-4 mt-2">
        <Pressable
          className="px-4 py-2"
          hitSlop={12}
          data-cy="navbar-back"
          testID="navbar-back"
          onPress={() => {
            props.dispatch(
              lb<IExercisePickerState>()
                .p("screenStack")
                .recordModify((stack) => stack.slice(0, -1)),
              "Pop screen in exercise picker screen stack"
            );
          }}
        >
          <IconBack />
        </Pressable>
        <Text className="flex-1 pr-12 font-bold text-center">Settings</Text>
      </View>
      <View className="px-4">
        <MenuItemEditable
          type="boolean"
          name="Keep existing program exercise logic when pick adhoc exercise"
          value={props.settings.workoutSettings.shouldKeepProgramExerciseId ? "true" : "false"}
          onChange={(v) => {
            props.onChange({
              shouldKeepProgramExerciseId: v === "true",
            });
          }}
        />
      </View>
    </View>
  );
}
