import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { MenuItemEditable } from "../menuItemEditable";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";
import { IEquipmentSetup, IUnit } from "../../types";
import { EquipmentSetup_convertUnit } from "../../models/equipmentSetup";
import { EquipmentSetupEdit_setRounding, EquipmentSetupEdit_unitChoice } from "../../models/equipmentSetupEdit";
import { Dialog_choice } from "../../utils/dialog";
import { EquipmentEditorCard, EquipmentEditorClose, IEquipmentEditorAction } from "./equipmentEditorParts";

interface IProps {
  setup: IEquipmentSetup;
  appUnit: IUnit;
  notes?: string;
  onUpdate: (setup: IEquipmentSetup) => void;
  onNotes: (notes: string) => void;
}

async function changeUnit(props: IProps, unit: IUnit): Promise<void> {
  if (unit === props.setup.unit) {
    return;
  }
  const choice = await Dialog_choice(`Change to ${unit}`, "Convert the values, or keep the numbers?", [
    `Convert (45 lb → 20 kg)`,
    "Keep the numbers",
    "Cancel",
  ]);
  const mode = EquipmentSetupEdit_unitChoice(choice);
  if (mode != null) {
    props.onUpdate(EquipmentSetup_convertUnit(props.setup, unit, mode));
  }
}

export function useEquipmentEditorCommon(props: IProps): { cards: JSX.Element; actions: IEquipmentEditorAction[] } {
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const { setup } = props;
  const isRoundingShown = setup.rounding != null;
  const isUnitShown = isUnitOpen || setup.unit !== props.appUnit;
  const isNotesShown = isNotesOpen || !!props.notes;

  const cards = (
    <View>
      {isRoundingShown && (
        <EquipmentEditorCard
          title="Rounding"
          right={
            <EquipmentEditorClose
              testID="equipment-rounding-remove"
              onPress={() => props.onUpdate(EquipmentSetupEdit_setRounding(setup, undefined))}
            />
          }
        >
          <MenuItemEditable
            name="Round to"
            type="select"
            isBorderless={true}
            value={setup.rounding}
            values={[
              ["down", "Down"],
              ["nearest", "Nearest"],
            ]}
            underName={
              <Text className="text-xs text-text-secondary">
                {setup.rounding === "nearest"
                  ? "The closest weight you can load"
                  : "Never heavier than the program says"}
              </Text>
            }
            onChange={(value) => props.onUpdate(EquipmentSetupEdit_setRounding(setup, value))}
          />
        </EquipmentEditorCard>
      )}
      {isUnitShown && (
        <EquipmentEditorCard
          title="Unit"
          right={
            <EquipmentEditorClose
              testID="equipment-unit-remove"
              onPress={async () => {
                await changeUnit(props, props.appUnit);
                setIsUnitOpen(false);
              }}
            />
          }
        >
          <MenuItemEditable
            name="Unit"
            type="select"
            isBorderless={true}
            value={setup.unit}
            values={[
              ["lb", "lb"],
              ["kg", "kg"],
            ]}
            underName={<Text className="text-xs text-text-secondary">Your app setting is {props.appUnit}</Text>}
            onChange={(value) => {
              if (value === "lb" || value === "kg") {
                changeUnit(props, value);
              }
            }}
          />
        </EquipmentEditorCard>
      )}
      {isNotesShown && (
        <EquipmentEditorCard
          title="Notes"
          right={
            <EquipmentEditorClose
              testID="equipment-notes-remove"
              onPress={() => {
                props.onNotes("");
                setIsNotesOpen(false);
              }}
            />
          }
        >
          <View className="pb-2" style={{ marginLeft: -4, marginRight: -4 }}>
            <MarkdownEditorBorderless
              debounceMs={500}
              value={props.notes}
              placeholder="Seat height, pin hole, hints…"
              onChange={props.onNotes}
            />
          </View>
        </EquipmentEditorCard>
      )}
    </View>
  );

  const actions: IEquipmentEditorAction[] = [
    ...(isRoundingShown
      ? []
      : [
          {
            name: "equipment-add-rounding",
            label: "Change rounding",
            onClick: () => props.onUpdate(EquipmentSetupEdit_setRounding(setup, "down")),
          },
        ]),
    ...(isUnitShown
      ? []
      : [{ name: "equipment-add-unit", label: "Use a different unit", onClick: () => setIsUnitOpen(true) }]),
    ...(isNotesShown ? [] : [{ name: "equipment-add-notes", label: "Add notes", onClick: () => setIsNotesOpen(true) }]),
  ];

  return { cards, actions };
}
