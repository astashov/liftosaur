import { JSX } from "react";
import { Animated, View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { equipmentName } from "../models/exercise";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useCustomKeyboardLift } from "../navigation/useCustomKeyboardLift";
import { EquipmentEditor, EquipmentEditorDock } from "./equipmentEditor/equipmentEditor";

interface IProps {
  gymId: string;
  equipmentId: string;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ScreenEquipmentDetail(props: IProps): JSX.Element {
  const gym = props.settings.gyms.find((g) => g.id === props.gymId);
  const data = gym?.equipment[props.equipmentId];
  const keypad = useCustomKeyboardLift();
  useNavOptions({ navTitle: data != null ? equipmentName(props.equipmentId, gym?.equipment) : "Equipment" });
  if (gym == null || data == null || data.isDeleted) {
    return (
      <View className="p-4">
        <Text className="text-sm text-text-secondary">This equipment no longer exists.</Text>
      </View>
    );
  }
  const editorProps = { ...props, data };
  return (
    <NavScreenContent
      avoidSystemKeyboard="reveal"
      footer={
        <Animated.View
          className="bg-background-default"
          style={{ paddingBottom: keypad.bottomInset, transform: [{ translateY: keypad.lift }] }}
        >
          <EquipmentEditorDock {...editorProps} />
        </Animated.View>
      }
    >
      <View className="px-4 pt-2 pb-4">
        <EquipmentEditor {...editorProps} />
      </View>
    </NavScreenContent>
  );
}
