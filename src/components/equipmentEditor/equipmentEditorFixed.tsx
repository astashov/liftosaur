import { JSX } from "react";
import { View } from "react-native";
import { IElectricSetup, IFixedSetup } from "../../types";
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

export function EquipmentEditorFixed(props: IEquipmentEditorSectionProps<IFixedSetup>): JSX.Element {
  const { setup, onChange } = props;
  return (
    <View>
      <EquipmentEditorCard title={`Weights · ${setup.unit}`}>
        <EquipmentEditorRanges
          ranges={setup.ranges}
          unit={setup.unit}
          testID="equipment-fixed"
          addLabel="Add another range"
          allowEmpty={true}
          onChange={(ranges) => onChange({ ...setup, ranges })}
        />
      </EquipmentEditorCard>
      <EquipmentEditorCard title="Single weights outside the ranges">
        <EquipmentEditorValues
          values={setup.values}
          unit={setup.unit}
          testID="equipment-single"
          addLabel="Add a single weight"
          onAdd={() => props.onAddWeight("values")}
          onChange={(values) => onChange({ ...setup, values })}
        />
      </EquipmentEditorCard>
      {setup.addOn != null && (
        <EquipmentEditorCard
          title="Plates you add"
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
      <EquipmentEditorBodyweightCard {...props} />
      {props.extraCards}
      <EquipmentEditorActions
        actions={[
          ...(setup.addOn == null
            ? [
                {
                  name: "equipment-add-addon",
                  label: "Add plates you add (fractional plates)",
                  onClick: () => onChange({ ...setup, addOn: [] }),
                },
              ]
            : []),
          ...EquipmentEditorBodyweightActions(props, ["adds"]),
          ...props.extraActions,
        ]}
      />
    </View>
  );
}

export function EquipmentEditorElectric(props: IEquipmentEditorSectionProps<IElectricSetup>): JSX.Element {
  const { setup, onChange } = props;
  return (
    <View>
      <EquipmentEditorCard help={`Any weight from ${setup.min} to ${setup.max}, in ${setup.step} ${setup.unit} steps.`}>
        <EquipmentEditorNumberRow
          label="Min"
          unit={setup.unit}
          value={setup.min}
          testID="equipment-min"
          onChange={(min) => onChange({ ...setup, min })}
        />
        <EquipmentEditorNumberRow
          label="Max"
          unit={setup.unit}
          value={setup.max}
          testID="equipment-max"
          onChange={(max) => onChange({ ...setup, max })}
        />
        <EquipmentEditorNumberRow
          label="Step"
          unit={setup.unit}
          isLast={true}
          value={setup.step}
          testID="equipment-step"
          onChange={(step) => onChange({ ...setup, step })}
        />
      </EquipmentEditorCard>
      {props.extraCards}
      <EquipmentEditorActions actions={props.extraActions} />
    </View>
  );
}
