import { JSX } from "react";
import { MenuItemEditable } from "../menuItemEditable";
import { IEquipmentSetup, IWeight } from "../../types";
import {
  EquipmentSetupEdit_bodyweightHelp,
  EquipmentSetupEdit_bodyweightPercent,
  EquipmentSetupEdit_setBodyweight,
  EquipmentSetupEdit_setBodyweightShare,
  IEquipmentBodyweightMode,
} from "../../models/equipmentSetupEdit";
import { EquipmentEditorCard, EquipmentEditorClose } from "./equipmentEditorParts";
import { EquipmentEditorNumberRow } from "./equipmentEditorShared";

interface IProps {
  setup: IEquipmentSetup;
  mode: IEquipmentBodyweightMode;
  bodyweight: IWeight;
  isBodyweightLogged: boolean;
  onChange: (setup: IEquipmentSetup) => void;
}

export function EquipmentEditorBodyweight(props: IProps): JSX.Element {
  const isAssisting = props.mode === "assists";
  return (
    <EquipmentEditorCard
      title={isAssisting ? "Helps you up" : "Weights include your bodyweight"}
      help={EquipmentSetupEdit_bodyweightHelp(props.setup, props.bodyweight, props.isBodyweightLogged)}
      right={
        <EquipmentEditorClose
          testID="equipment-bodyweight-remove"
          onPress={() => props.onChange(EquipmentSetupEdit_setBodyweight(props.setup, "none", false))}
        />
      }
    >
      {isAssisting ? (
        <MenuItemEditable
          name="Program weights are"
          type="select"
          isBorderless={true}
          value={props.setup.bodyweight != null ? "total" : "load"}
          values={[
            ["load", "Assistance, negative"],
            ["total", "Bodyweight − assistance"],
          ]}
          onChange={(value) =>
            props.onChange(EquipmentSetupEdit_setBodyweight(props.setup, "assists", value === "total"))
          }
        />
      ) : (
        <EquipmentEditorNumberRow
          label="Share of bodyweight"
          help="Below 100% for push-ups and other partial-bodyweight moves"
          unit="%"
          min={1}
          max={100}
          isLast={true}
          value={EquipmentSetupEdit_bodyweightPercent(props.setup)}
          testID="equipment-bodyweight-share"
          onChange={(value) => props.onChange(EquipmentSetupEdit_setBodyweightShare(props.setup, value))}
        />
      )}
    </EquipmentEditorCard>
  );
}
