import { JSX, ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { InputNumber2 } from "../inputNumber2";
import { IconTrash } from "../icons/iconTrash";
import { IconClose2 } from "../icons/iconClose2";
import { AddButton } from "../addButton";
import { MenuItem } from "../menuItem";
import { IPlateCount, IUnit, IWeightRange } from "../../types";
import {
  EquipmentSetupEdit_addRange,
  EquipmentSetupEdit_removeRange,
  EquipmentSetupEdit_removeValue,
  EquipmentSetupEdit_setPlateCount,
  EquipmentSetupEdit_updateRange,
} from "../../models/equipmentSetupEdit";

export function EquipmentEditorCard(props: {
  title?: string;
  right?: ReactNode;
  help?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <View className="px-4 mb-3 border rounded-xl border-border-cardpurple bg-background-subtlecardpurple">
      {(props.title != null || props.right != null) && (
        <View className="flex-row items-center justify-between pt-3" style={{ marginRight: -8 }}>
          <Text className="text-xs text-text-secondary">{props.title}</Text>
          {props.right}
        </View>
      )}
      {props.children}
      {props.help != null && <Text className="pb-3 text-xs text-text-secondary">{props.help}</Text>}
    </View>
  );
}

export interface IEquipmentEditorAction {
  name: string;
  label: string;
  onClick: () => void;
}

export function EquipmentEditorActions(props: { actions: IEquipmentEditorAction[] }): JSX.Element | null {
  if (props.actions.length === 0) {
    return null;
  }
  return (
    <View className="px-4 mb-3 border rounded-xl border-border-cardpurple bg-background-subtlecardpurple">
      {props.actions.map((action, index) => (
        <View key={action.name} className={index < props.actions.length - 1 ? "border-b border-border-cardpurple" : ""}>
          <AddButton name={action.name} label={action.label} onClick={action.onClick} />
        </View>
      ))}
    </View>
  );
}

export function EquipmentEditorRemove(props: { onPress: () => void; testID: string }): JSX.Element {
  return (
    <Pressable className="p-2" testID={props.testID} data-testid={props.testID} onPress={props.onPress}>
      <IconTrash width={14} height={18} />
    </Pressable>
  );
}

export function EquipmentEditorClose(props: { onPress: () => void; testID: string }): JSX.Element {
  return (
    <Pressable className="p-2" testID={props.testID} data-testid={props.testID} onPress={props.onPress}>
      <IconClose2 size={14} />
    </Pressable>
  );
}

interface IRangesProps {
  ranges: IWeightRange[];
  unit: IUnit;
  testID: string;
  addLabel: string;
  allowEmpty?: boolean;
  onChange: (ranges: IWeightRange[]) => void;
}

export function EquipmentEditorRanges(props: IRangesProps): JSX.Element {
  const [emptyCount, setEmptyCount] = useState(0);
  const update = (index: number, key: keyof IWeightRange, value: number | undefined): void => {
    if (value != null) {
      props.onChange(EquipmentSetupEdit_updateRange(props.ranges, index, { [key]: value }));
    } else {
      setEmptyCount(emptyCount + 1);
    }
  };
  return (
    <View key={emptyCount}>
      {props.ranges.map((range, index) => (
        <View key={index} className="flex-row items-center py-3 border-b border-border-cardpurple" style={{ gap: 6 }}>
          <InputNumber2
            name={`${props.testID}-from-${index}`}
            testID={`${props.testID}-from-${index}`}
            width={4}
            allowDot={true}
            value={range.from}
            onBlur={(value) => update(index, "from", value)}
          />
          <Text className="text-text-secondary">→</Text>
          <InputNumber2
            name={`${props.testID}-to-${index}`}
            testID={`${props.testID}-to-${index}`}
            width={4}
            allowDot={true}
            value={range.to}
            onBlur={(value) => update(index, "to", value)}
          />
          <Text className="text-text-secondary">by</Text>
          <InputNumber2
            name={`${props.testID}-step-${index}`}
            testID={`${props.testID}-step-${index}`}
            width={3.5}
            allowDot={true}
            value={range.step}
            onBlur={(value) => update(index, "step", value)}
          />
          <Text className="flex-1 text-sm text-text-secondary">{props.unit}</Text>
          {(props.allowEmpty || props.ranges.length > 1) && (
            <EquipmentEditorRemove
              testID={`${props.testID}-remove-${index}`}
              onPress={() => props.onChange(EquipmentSetupEdit_removeRange(props.ranges, index))}
            />
          )}
        </View>
      ))}
      <AddButton
        name={`${props.testID}-add`}
        label={props.addLabel}
        onClick={() => props.onChange(EquipmentSetupEdit_addRange(props.ranges))}
      />
    </View>
  );
}

interface IPlateCountsProps {
  plates: IPlateCount[];
  unit: IUnit;
  testID: string;
  addLabel: string;
  onAdd: () => void;
  onChange: (plates: IPlateCount[]) => void;
}

export function EquipmentEditorPlateCounts(props: IPlateCountsProps): JSX.Element {
  return (
    <View>
      {props.plates.map((plate) => (
        <MenuItem
          key={plate.weight}
          name={`${plate.weight} ${props.unit}`}
          value={
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Text className="text-sm text-text-secondary">×</Text>
              <InputNumber2
                name={`${props.testID}-count-${plate.weight}`}
                testID={`${props.testID}-count-${plate.weight}`}
                width={3.5}
                min={0}
                step={1}
                value={plate.num}
                onBlur={(value) => {
                  if (value != null) {
                    props.onChange(EquipmentSetupEdit_setPlateCount(props.plates, plate.weight, value));
                  }
                }}
              />
              <EquipmentEditorRemove
                testID={`${props.testID}-remove-${plate.weight}`}
                onPress={() => props.onChange(EquipmentSetupEdit_setPlateCount(props.plates, plate.weight, 0))}
              />
            </View>
          }
        />
      ))}
      <AddButton name={`${props.testID}-add`} label={props.addLabel} onClick={props.onAdd} />
    </View>
  );
}

interface IValuesProps {
  values: number[];
  unit: IUnit;
  testID: string;
  addLabel: string;
  onAdd: () => void;
  onChange: (values: number[]) => void;
}

export function EquipmentEditorValues(props: IValuesProps): JSX.Element {
  return (
    <View>
      {props.values.length > 0 && (
        <View className="flex-row flex-wrap pt-3 pb-1" style={{ gap: 6 }}>
          {props.values.map((value) => (
            <Pressable
              key={value}
              className="flex-row items-center px-3 py-1 border rounded-full border-border-neutral"
              testID={`${props.testID}-value-${value}`}
              data-testid={`${props.testID}-value-${value}`}
              onPress={() => props.onChange(EquipmentSetupEdit_removeValue(props.values, value))}
            >
              <Text className="text-sm">
                {value} {props.unit}
              </Text>
              <Text className="ml-2 text-xs text-text-secondary">×</Text>
            </Pressable>
          ))}
        </View>
      )}
      <AddButton name={`${props.testID}-add`} label={props.addLabel} onClick={props.onAdd} />
    </View>
  );
}
