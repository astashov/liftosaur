import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { IconEquipmentBarbell } from "./icons/iconEquipmentBarbell";
import { IconEquipmentCable } from "./icons/iconEquipmentCable";
import { IconEquipmentDumbbell } from "./icons/iconEquipmentDumbbell";
import { IconEquipmentEzBar } from "./icons/iconEquipmentEzBar";
import { IconEquipmentKettlebell } from "./icons/iconEquipmentKettlebell";
import { IconEquipmentLeverageMachine } from "./icons/iconEquipmentLeverageMachine";
import { IconEquipmentSmith } from "./icons/iconEquipmentSmith";
import { IconEquipmentTrapbar } from "./icons/iconEquipmentTrapbar";
import { IDispatch } from "../ducks/types";
import { IAllEquipment, ISettings } from "../types";
import { equipmentName } from "../models/exercise";
import { Equipment_isBuiltIn, Equipment_setupOf } from "../models/equipment";
import { EquipmentSetup_summary } from "../models/equipmentSetup";
import { EditEquipment_setDeleted } from "../models/editEquipment";
import { ObjectUtils_keys } from "../utils/object";
import { StringUtils_dashcase } from "../utils/string";
import { Dialog_confirm } from "../utils/dialog";

export const equipmentToIcon: Record<string, () => JSX.Element> = {
  barbell: () => <IconEquipmentBarbell />,
  trapbar: () => <IconEquipmentTrapbar />,
  leverageMachine: () => <IconEquipmentLeverageMachine />,
  smith: () => <IconEquipmentSmith />,
  dumbbell: () => <IconEquipmentDumbbell />,
  ezbar: () => <IconEquipmentEzBar />,
  cable: () => <IconEquipmentCable />,
  kettlebell: () => <IconEquipmentKettlebell />,
};

interface IEquipmentListProps {
  gymId: string;
  allEquipment: IAllEquipment;
  settings: ISettings;
  dispatch: IDispatch;
  onOpen: (equipmentId: string) => void;
  onAdd: () => void;
}

export function EquipmentList(props: IEquipmentListProps): JSX.Element {
  const keys = ObjectUtils_keys(props.allEquipment);
  const visibleKeys = keys.filter((key) => !props.allEquipment[key]?.isDeleted);
  const hiddenKeys = keys.filter((key) => Equipment_isBuiltIn(key) && props.allEquipment[key]?.isDeleted);
  return (
    <View>
      {visibleKeys.map((key) => {
        const data = props.allEquipment[key]!;
        const name = equipmentName(key, props.allEquipment);
        const isBuiltIn = Equipment_isBuiltIn(key);
        const summary = EquipmentSetup_summary(Equipment_setupOf(data, props.settings));
        return (
          <Pressable
            key={key}
            className="flex-row items-center px-3 py-3 mx-2 mb-3 border rounded-xl bg-background-default border-border-neutral"
            style={{ gap: 8 }}
            testID={`group-header-${StringUtils_dashcase(name)}`}
            data-testid={`group-header-${StringUtils_dashcase(name)}`}
            onPress={() => props.onOpen(key)}
          >
            {equipmentToIcon[key] != null && <View>{equipmentToIcon[key]()}</View>}
            <View className="flex-1">
              <Text className="font-semibold">{name}</Text>
              <Text className="text-xs text-text-secondary" numberOfLines={2}>
                {summary}
              </Text>
            </View>
            <Pressable
              className="p-2"
              testID={`delete-equipment-${StringUtils_dashcase(name)}`}
              data-testid={`delete-equipment-${StringUtils_dashcase(name)}`}
              onPress={async () => {
                if (isBuiltIn || (await Dialog_confirm("Are you sure?"))) {
                  EditEquipment_setDeleted(props.dispatch, props.gymId, key, true);
                }
              }}
            >
              {isBuiltIn ? <IconEyeClosed /> : <IconTrash />}
            </Pressable>
            <Text className="text-text-secondary">›</Text>
          </Pressable>
        );
      })}
      {hiddenKeys.length > 0 && (
        <View className="flex-row flex-wrap mx-4 my-2">
          <Text className="text-xs">Hidden Equipment: </Text>
          {hiddenKeys.map((key, i) => (
            <View key={key} className="flex-row">
              {i !== 0 && <Text className="text-xs">, </Text>}
              <LinkButton
                className="text-xs"
                name={`show-equipment-${key}`}
                onClick={() => EditEquipment_setDeleted(props.dispatch, props.gymId, key, false)}
              >
                {equipmentName(key, props.allEquipment)}
              </LinkButton>
            </View>
          ))}
        </View>
      )}
      <View className="m-4">
        <LinkButton className="text-sm" name="add-new-equipment" onClick={props.onAdd}>
          Add New Equipment Type
        </LinkButton>
      </View>
    </View>
  );
}
