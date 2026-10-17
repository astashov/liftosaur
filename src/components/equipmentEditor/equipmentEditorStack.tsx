import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { MenuItemEditable } from "../menuItemEditable";
import { IStackSetup } from "../../types";
import {
  EquipmentEditorActions,
  EquipmentEditorCard,
  EquipmentEditorPlateCounts,
  EquipmentEditorRanges,
  EquipmentEditorClose,
  EquipmentEditorValues,
} from "./equipmentEditorParts";
import {
  EquipmentEditorBodyweightActions,
  EquipmentEditorBodyweightCard,
  EquipmentEditorNumberRow,
  IEquipmentEditorSectionProps,
} from "./equipmentEditorShared";

const PULL_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 1, label: "same" },
  { ratio: 0.5, label: "half" },
  { ratio: 0.25, label: "quarter" },
];

export function EquipmentEditorStack(props: IEquipmentEditorSectionProps<IStackSetup>): JSX.Element {
  const { setup, onChange } = props;
  const hasAddOns = setup.builtin != null || setup.addOn != null;
  return (
    <View>
      <EquipmentEditorCard
        title={setup.direction === "assists" ? `Assistance stack · ${setup.unit}` : `Stack · ${setup.unit}`}
      >
        <EquipmentEditorRanges
          ranges={setup.ranges}
          unit={setup.unit}
          testID="equipment-stack"
          addLabel="Add a different step for part of the stack"
          onChange={(ranges) => onChange({ ...setup, ranges })}
        />
      </EquipmentEditorCard>
      {setup.pullRatio != null && (
        <EquipmentEditorCard
          title="Pull ratio"
          help={`Not sure? Pick "same".`}
          right={
            <EquipmentEditorClose
              testID="equipment-ratio-remove"
              onPress={() => onChange({ ...setup, pullRatio: undefined })}
            />
          }
        >
          <MenuItemEditable
            name={`Stack says 100 ${setup.unit}, you pull`}
            type="select"
            isBorderless={true}
            value={`${setup.pullRatio}`}
            values={PULL_RATIOS.map<[string, string]>((o) => [
              `${o.ratio}`,
              `${100 * o.ratio} ${setup.unit}, ${o.label}`,
            ])}
            onChange={(value) => onChange({ ...setup, pullRatio: Number(value) })}
          />
        </EquipmentEditorCard>
      )}
      {setup.base != null && (
        <EquipmentEditorCard
          right={
            <EquipmentEditorClose
              testID="equipment-base-remove"
              onPress={() => onChange({ ...setup, base: undefined })}
            />
          }
          title="Always lifted with the stack"
        >
          <EquipmentEditorNumberRow
            label="Weight"
            help="A handle or carriage the stack number does not include"
            unit={setup.unit}
            isLast={true}
            value={setup.base}
            testID="equipment-base"
            onChange={(base) => onChange({ ...setup, base })}
          />
        </EquipmentEditorCard>
      )}
      {setup.builtin != null && (
        <EquipmentEditorCard
          title="Built-in weights · pick one per set"
          right={
            <EquipmentEditorClose
              testID="equipment-builtin-remove"
              onPress={() => onChange({ ...setup, builtin: undefined })}
            />
          }
        >
          <EquipmentEditorValues
            values={setup.builtin}
            unit={setup.unit}
            testID="equipment-builtin"
            addLabel="Add a built-in weight"
            onAdd={() => props.onAddWeight("builtin")}
            onChange={(builtin) => onChange({ ...setup, builtin })}
          />
        </EquipmentEditorCard>
      )}
      {setup.addOn != null && (
        <EquipmentEditorCard
          title="Plates you add · combine them"
          right={
            <EquipmentEditorClose
              testID="equipment-addon-remove"
              onPress={() => onChange({ ...setup, addOn: undefined })}
            />
          }
        >
          <EquipmentEditorPlateCounts
            plates={setup.addOn}
            unit={setup.unit}
            testID="equipment-addon"
            addLabel="Add a size"
            onAdd={() => props.onAddWeight("addOn")}
            onChange={(addOn) => onChange({ ...setup, addOn })}
          />
        </EquipmentEditorCard>
      )}
      {hasAddOns && (
        <EquipmentEditorCard>
          <MenuItemEditable
            name="Skip add-ons in warmups"
            type="boolean"
            isBorderless={true}
            value={setup.skipAddOnsInWarmups ? "true" : "false"}
            underName={<Text className="text-xs text-text-secondary">Warmups use the stack only</Text>}
            onChange={(value) => onChange({ ...setup, skipAddOnsInWarmups: value === "true" || undefined })}
          />
        </EquipmentEditorCard>
      )}
      <EquipmentEditorBodyweightCard {...props} />
      {props.extraCards}
      <EquipmentEditorActions
        actions={[
          ...(setup.builtin == null
            ? [
                {
                  name: "equipment-add-builtin",
                  label: "Add built-in weights (lever, drop-down, knob)",
                  onClick: () => onChange({ ...setup, builtin: [] }),
                },
              ]
            : []),
          ...(setup.addOn == null
            ? [
                {
                  name: "equipment-add-addon",
                  label: "Add plates you add (magnets, small blocks)",
                  onClick: () => onChange({ ...setup, addOn: [] }),
                },
              ]
            : []),
          ...(setup.pullRatio == null
            ? [
                {
                  name: "equipment-add-ratio",
                  label: "Add pull ratio",
                  onClick: () => onChange({ ...setup, pullRatio: 1 }),
                },
              ]
            : []),
          ...(setup.base == null
            ? [
                {
                  name: "equipment-add-base",
                  label: "Add weight that always lifts with the stack",
                  onClick: () => onChange({ ...setup, base: 0 }),
                },
              ]
            : []),
          ...EquipmentEditorBodyweightActions(props, ["assists"]),
          ...props.extraActions,
        ]}
      />
    </View>
  );
}
