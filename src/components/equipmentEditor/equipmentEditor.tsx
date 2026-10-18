import { JSX, useState } from "react";
import { View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";
import { Text } from "../primitives/text";
import { MenuItemEditable } from "../menuItemEditable";
import { EquipmentEditorCard } from "./equipmentEditorParts";
import { IDispatch } from "../../ducks/types";
import { IEquipmentData, IEquipmentSetup, ISettings } from "../../types";
import { navigateToModal } from "../../navigation/navigationService";
import { Equipment_bodyweight, Equipment_isBuiltIn, Equipment_setupOf } from "../../models/equipment";
import { EquipmentSetup_validate } from "../../models/equipmentSetup";
import {
  EquipmentSetupEdit_changeType,
  EquipmentSetupEdit_parseType,
  EquipmentSetupEdit_typeDescription,
  EquipmentSetupEdit_typeName,
  EquipmentSetupEdit_types,
  IEquipmentWeightList,
} from "../../models/equipmentSetupEdit";
import { EditEquipment_setText, EditEquipment_update } from "../../models/editEquipment";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import { useEquipmentEditorCommon } from "./equipmentEditorCommon";
import { EquipmentEditorElectric, EquipmentEditorFixed } from "./equipmentEditorFixed";
import { EquipmentEditorBands } from "./equipmentEditorBands";
import { EquipmentEditorPlates } from "./equipmentEditorPlates";
import { EquipmentEditorStack } from "./equipmentEditorStack";
import { EquipmentEditorTryWeight } from "./equipmentEditorTryWeight";

const TYPE_VALUES: [IEquipmentSetup["type"], string][] = EquipmentSetupEdit_types.map((t) => [t.type, t.label]);

interface IEquipmentEditorProps {
  gymId: string;
  equipmentId: string;
  data: IEquipmentData;
  settings: ISettings;
  dispatch: IDispatch;
}

export function EquipmentEditorDock(props: IEquipmentEditorProps): JSX.Element {
  const setup = Equipment_setupOf(props.data, props.settings);
  const errors = EquipmentSetup_validate(setup);
  return (
    <EquipmentEditorTryWeight
      key={`${props.gymId}-${props.equipmentId}-${setup.type}-${errors.length > 0}`}
      setup={setup}
      errors={errors}
      bodyweight={Equipment_bodyweight(props.settings)}
    />
  );
}

export function EquipmentEditor(props: IEquipmentEditorProps): JSX.Element {
  const [rejectedCount, setRejectedCount] = useState(0);
  const setup = Equipment_setupOf(props.data, props.settings);
  const update = (next: IEquipmentSetup): void => {
    const errors = EditEquipment_update(props.dispatch, props.gymId, props.equipmentId, next, props.settings.units);
    if (errors.length > 0) {
      setRejectedCount(rejectedCount + 1);
      Dialog_alert(errors[0]);
    }
  };
  const common = useEquipmentEditorCommon({
    setup,
    appUnit: props.settings.units,
    notes: props.data.notes,
    onUpdate: update,
    onNotes: (notes) => EditEquipment_setText(props.dispatch, props.gymId, props.equipmentId, "notes", notes),
  });
  const sectionProps = {
    bodyweight: Equipment_bodyweight(props.settings),
    isBodyweightLogged: props.settings.currentBodyweight != null,
    extraCards: common.cards,
    extraActions: common.actions,
    onChange: update,
    onAddWeight: (list: IEquipmentWeightList) =>
      navigateToModal("newPlateModal", { gymId: props.gymId, equipmentId: props.equipmentId, list }),
  };

  return (
    <View testID="equipment-editor">
      <LayoutAnimationConfig skipEntering skipExiting>
        <EquipmentEditorCard>
          {!Equipment_isBuiltIn(props.equipmentId) && (
            <MenuItemEditable
              name="Name"
              type="text"
              value={props.data.name ?? ""}
              onChange={(value) =>
                EditEquipment_setText(props.dispatch, props.gymId, props.equipmentId, "name", value ?? "")
              }
            />
          )}
          <MenuItemEditable
            name="Type"
            type="select"
            isBorderless={true}
            value={setup.type}
            values={TYPE_VALUES}
            underName={
              <Text className="text-xs text-text-secondary">{EquipmentSetupEdit_typeDescription(setup.type)}</Text>
            }
            onChange={async (value) => {
              const type = EquipmentSetupEdit_parseType(value);
              const next = type != null ? EquipmentSetupEdit_changeType(setup, type) : setup;
              if (next !== setup) {
                const typeName = EquipmentSetupEdit_typeName(setup.type).toLowerCase();
                if (await Dialog_confirm(`Replace this setup? Your ${typeName} settings will be lost.`)) {
                  update(next);
                }
              }
            }}
          />
        </EquipmentEditorCard>
      </LayoutAnimationConfig>
      <LayoutAnimationConfig key={rejectedCount} skipEntering skipExiting>
        {setup.type === "stack" && <EquipmentEditorStack {...sectionProps} setup={setup} />}
        {setup.type === "plates" && <EquipmentEditorPlates {...sectionProps} setup={setup} />}
        {setup.type === "fixed" && <EquipmentEditorFixed {...sectionProps} setup={setup} />}
        {setup.type === "electric" && <EquipmentEditorElectric {...sectionProps} setup={setup} />}
        {setup.type === "bands" && <EquipmentEditorBands {...sectionProps} setup={setup} />}
      </LayoutAnimationConfig>
    </View>
  );
}
