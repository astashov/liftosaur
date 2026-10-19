import { JSX, ReactNode, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { InputNumber2 } from "../inputNumber2";
import { MenuItem } from "../menuItem";
import { IEquipmentSetup, IWeight } from "../../types";
import {
  EquipmentSetupEdit_bodyweightMode,
  EquipmentSetupEdit_bodyweightModesToAdd,
  EquipmentSetupEdit_setBodyweight,
  IEquipmentBodyweightMode,
  IEquipmentWeightList,
} from "../../models/equipmentSetupEdit";
import { IEquipmentEditorAction } from "./equipmentEditorParts";
import { EquipmentEditorBodyweight } from "./equipmentEditorBodyweight";

export interface IEquipmentEditorSectionProps<T extends IEquipmentSetup> {
  setup: T;
  bodyweight: IWeight;
  isBodyweightLogged: boolean;
  extraCards: ReactNode;
  extraActions: IEquipmentEditorAction[];
  onChange: (setup: IEquipmentSetup) => void;
  onAddWeight: (list: IEquipmentWeightList) => void;
}

export function EquipmentEditorBodyweightCard<T extends IEquipmentSetup>(
  props: IEquipmentEditorSectionProps<T>
): JSX.Element | null {
  const mode = EquipmentSetupEdit_bodyweightMode(props.setup);
  if (mode == null) {
    return null;
  }
  return (
    <EquipmentEditorBodyweight
      setup={props.setup}
      mode={mode}
      bodyweight={props.bodyweight}
      isBodyweightLogged={props.isBodyweightLogged}
      onChange={props.onChange}
    />
  );
}

export function EquipmentEditorBodyweightActions<T extends IEquipmentSetup>(
  props: IEquipmentEditorSectionProps<T>,
  modes: IEquipmentBodyweightMode[]
): IEquipmentEditorAction[] {
  return EquipmentSetupEdit_bodyweightModesToAdd(props.setup, modes).map((mode) => ({
    ...bodyweightActionLabels[mode],
    onClick: () => props.onChange(EquipmentSetupEdit_setBodyweight(props.setup, mode, true)),
  }));
}

const bodyweightActionLabels: Record<IEquipmentBodyweightMode, { name: string; label: string }> = {
  adds: { name: "equipment-add-bodyweight", label: "Include bodyweight (dip belt, vest)" },
  assists: { name: "equipment-add-assisting", label: "Helps you up (assisted machine)" },
};

export function EquipmentEditorNumberRow(props: {
  label: string;
  help?: string;
  unit?: string;
  value: number;
  testID: string;
  min?: number;
  max?: number;
  isLast?: boolean;
  onChange: (value: number) => void;
}): JSX.Element {
  const [emptyCount, setEmptyCount] = useState(0);
  return (
    <MenuItem
      name={props.label}
      isBorderless={props.isLast}
      addons={props.help != null ? <Text className="text-xs text-text-secondary">{props.help}</Text> : undefined}
      value={
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <InputNumber2
            key={emptyCount}
            name={props.testID}
            testID={props.testID}
            width={4}
            allowDot={true}
            min={props.min}
            max={props.max}
            value={props.value}
            onBlur={(value) => {
              if (value != null) {
                props.onChange(value);
              } else {
                setEmptyCount(emptyCount + 1);
              }
            }}
          />
          {props.unit != null && <Text className="text-sm text-text-secondary">{props.unit}</Text>}
        </View>
      }
    />
  );
}
