import { JSX, useRef } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { TextInput } from "../primitives/textInput";
import { InputNumber2 } from "../inputNumber2";
import { MenuItemEditable } from "../menuItemEditable";
import { AddButton } from "../addButton";
import { IEquipmentHorn, IPlatesSetup } from "../../types";
import {
  EquipmentSetupEdit_addHorn,
  EquipmentSetupEdit_canAddHorn,
  EquipmentSetupEdit_hornPercents,
  EquipmentSetupEdit_defaultWarmupPlates,
  EquipmentSetupEdit_removeHorn,
  EquipmentSetupEdit_setHornName,
  EquipmentSetupEdit_setHornRatio,
  EquipmentSetupEdit_toggleWarmupPlate,
} from "../../models/equipmentSetupEdit";
import {
  EquipmentEditorActions,
  EquipmentEditorCard,
  EquipmentEditorPlateCounts,
  EquipmentEditorClose,
  EquipmentEditorRemove,
} from "./equipmentEditorParts";
import {
  EquipmentEditorBodyweightActions,
  EquipmentEditorBodyweightCard,
  EquipmentEditorNumberRow,
  IEquipmentEditorSectionProps,
} from "./equipmentEditorShared";

export function EquipmentEditorPlates(props: IEquipmentEditorSectionProps<IPlatesSetup>): JSX.Element {
  const { setup, onChange } = props;
  const horns = setup.horns ?? [];
  const percents = EquipmentSetupEdit_hornPercents(horns);
  return (
    <View>
      <EquipmentEditorCard>
        <EquipmentEditorNumberRow
          label="Base weight"
          help="Bar, belt, vest or empty machine"
          unit={setup.unit}
          value={setup.base}
          testID="equipment-base"
          onChange={(base) => onChange({ ...setup, base })}
        />
        {setup.sides === 1 || setup.sides === 2 ? (
          <MenuItemEditable
            name="Loading"
            type="select"
            isBorderless={true}
            value={`${setup.sides}`}
            values={[
              ["2", "Both sides"],
              ["1", "One side"],
            ]}
            onChange={(value) => onChange({ ...setup, sides: Number(value) })}
          />
        ) : (
          <EquipmentEditorNumberRow
            label="Sides"
            isLast={true}
            value={setup.sides}
            testID="equipment-sides-count"
            onChange={(sides) => onChange({ ...setup, sides })}
          />
        )}
      </EquipmentEditorCard>
      <EquipmentEditorCard title="Plates you have · total count">
        <EquipmentEditorPlateCounts
          plates={setup.plates}
          unit={setup.unit}
          testID="equipment-plates"
          addLabel="Add a plate size"
          onAdd={() => props.onAddWeight("plates")}
          onChange={(plates) => onChange({ ...setup, plates })}
        />
      </EquipmentEditorCard>
      {horns.length > 0 && (
        <EquipmentEditorCard
          title="Horns · plates are shared"
          right={
            <EquipmentEditorClose
              testID="equipment-horns-remove"
              onPress={() => onChange({ ...setup, horns: undefined })}
            />
          }
          help={
            horns.length > 1
              ? "The ratios set how the plates split between horns. Top 3 and Middle 1 puts three plates on Top for each one on Middle."
              : undefined
          }
        >
          {horns.map((horn, index) => (
            <EquipmentEditorHornRow
              key={`${index}-${horn.name}`}
              horn={horn}
              index={index}
              percent={horns.length > 1 ? percents[index] : undefined}
              onRename={(name) => onChange({ ...setup, horns: EquipmentSetupEdit_setHornName(horns, index, name) })}
              onRatio={(ratio) => onChange({ ...setup, horns: EquipmentSetupEdit_setHornRatio(horns, index, ratio) })}
              onRemove={() => onChange({ ...setup, horns: EquipmentSetupEdit_removeHorn(horns, index) })}
            />
          ))}
          {EquipmentSetupEdit_canAddHorn(horns) && (
            <AddButton
              name="equipment-add-horn"
              label="Add another horn"
              onClick={() => onChange({ ...setup, horns: EquipmentSetupEdit_addHorn(horns) })}
            />
          )}
        </EquipmentEditorCard>
      )}
      {setup.warmupPlates != null && (
        <EquipmentEditorCard
          title="Warmups use only"
          help="Warmup sets load only these plate sizes, so you change fewer plates."
          right={
            <EquipmentEditorClose
              testID="equipment-warmup-remove"
              onPress={() => onChange({ ...setup, warmupPlates: undefined })}
            />
          }
        >
          {setup.plates.map((plate, index) => (
            <MenuItemEditable
              key={plate.weight}
              name={`${plate.weight} ${setup.unit}`}
              type="boolean"
              isBorderless={index === setup.plates.length - 1}
              value={setup.warmupPlates!.indexOf(plate.weight) !== -1 ? "true" : "false"}
              onChange={() =>
                onChange({
                  ...setup,
                  warmupPlates: EquipmentSetupEdit_toggleWarmupPlate(setup.warmupPlates!, plate.weight),
                })
              }
            />
          ))}
        </EquipmentEditorCard>
      )}
      <EquipmentEditorBodyweightCard {...props} />
      {props.extraCards}
      <EquipmentEditorActions
        actions={[
          ...(horns.length === 0
            ? [
                {
                  name: "equipment-add-horns",
                  label: "Add horns (multi-horn plate-loaded machine)",
                  onClick: () => onChange({ ...setup, horns: EquipmentSetupEdit_addHorn(horns) }),
                },
              ]
            : []),
          ...(setup.warmupPlates == null
            ? [
                {
                  name: "equipment-add-warmup",
                  label: "Use fewer plates for warmups",
                  onClick: () =>
                    onChange({ ...setup, warmupPlates: EquipmentSetupEdit_defaultWarmupPlates(setup.plates) }),
                },
              ]
            : []),
          ...EquipmentEditorBodyweightActions(props, ["adds", "assists"]),
          ...props.extraActions,
        ]}
      />
    </View>
  );
}

interface IHornRowProps {
  horn: IEquipmentHorn;
  index: number;
  percent?: number;
  onRename: (name: string) => void;
  onRatio: (ratio: number) => void;
  onRemove: () => void;
}

function EquipmentEditorHornRow(props: IHornRowProps): JSX.Element {
  const { horn, index } = props;
  const nameRef = useRef(horn.name);
  return (
    <View className="py-2 border-b border-border-cardpurple">
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <TextInput
          className="flex-1 px-2 text-sm border rounded h-scaled-6 border-border-prominent bg-background-default text-text-primary"
          style={{ paddingVertical: 0, includeFontPadding: false }}
          testID={`equipment-horn-name-${index}`}
          data-testid={`equipment-horn-name-${index}`}
          defaultValue={horn.name}
          onChangeText={(text) => {
            nameRef.current = text;
          }}
          onBlur={() => props.onRename(nameRef.current)}
        />
        <Text className="text-sm text-text-secondary">ratio</Text>
        <InputNumber2
          name={`equipment-horn-ratio-${index}`}
          testID={`equipment-horn-ratio-${index}`}
          width={3}
          min={0}
          value={horn.ratio}
          onBlur={(ratio) => {
            if (ratio != null) {
              props.onRatio(ratio);
            }
          }}
        />
        <EquipmentEditorRemove testID={`equipment-horn-remove-${index}`} onPress={props.onRemove} />
      </View>
      {props.percent != null && (
        <Text className="mt-1 text-xs text-text-secondary">{props.percent}% of the plates</Text>
      )}
    </View>
  );
}
