import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { InputNumber2 } from "../inputNumber2";
import { MenuItem } from "../menuItem";
import { MenuItemEditable } from "../menuItemEditable";
import { AddButton } from "../addButton";
import { IPlatesSetup } from "../../types";
import {
  EquipmentSetupEdit_addHorn,
  EquipmentSetupEdit_canAddHorn,
  EquipmentSetupEdit_hornPercents,
  EquipmentSetupEdit_defaultWarmupPlates,
  EquipmentSetupEdit_removeHorn,
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
            <MenuItem
              key={index}
              name={horn.name ?? `Horn ${index + 1}`}
              addons={
                horns.length > 1 ? (
                  <Text className="text-xs text-text-secondary">{percents[index]}% of the plates</Text>
                ) : undefined
              }
              value={
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Text className="text-sm text-text-secondary">ratio</Text>
                  <InputNumber2
                    name={`equipment-horn-ratio-${index}`}
                    testID={`equipment-horn-ratio-${index}`}
                    width={3}
                    min={0}
                    value={horn.ratio}
                    onBlur={(ratio) => {
                      if (ratio != null) {
                        onChange({ ...setup, horns: EquipmentSetupEdit_setHornRatio(horns, index, ratio) });
                      }
                    }}
                  />
                  <EquipmentEditorRemove
                    testID={`equipment-horn-remove-${index}`}
                    onPress={() => onChange({ ...setup, horns: EquipmentSetupEdit_removeHorn(horns, index) })}
                  />
                </View>
              }
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
