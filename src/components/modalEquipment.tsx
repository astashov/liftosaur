import type { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Dialog_confirm } from "../utils/dialog";
import { IDispatch } from "../ducks/types";
import { MenuItemEditable } from "./menuItemEditable";
import { Equipment_activeIdForExercise, Equipment_getCurrentGym } from "../models/equipment";
import { IExerciseType, IHistoryEntry, ISettings, IStats } from "../types";
import { ObjectUtils_filter, ObjectUtils_keys } from "../utils/object";
import { equipmentName, Exercise_eq, Exercise_defaultRounding } from "../models/exercise";
import {
  EditEquipment_copyConfirmText,
  EditEquipment_copyForExercise,
  EditEquipment_removal,
  EditEquipment_removeForExercise,
  EditEquipment_setEquipmentForExercise,
  EditEquipment_setDefaultRoundingForExercise,
} from "../models/editEquipment";
import { CollectionUtils_compact } from "../utils/collection";
import { InputNumber } from "./inputNumber";
import { LinkButton } from "./linkButton";
import { useTrackClick } from "../utils/clickTracking";
import { navigateToModal } from "../navigation/navigationService";
import { EquipmentEditor, EquipmentEditorDock } from "./equipmentEditor/equipmentEditor";

export interface IModalEquipmentContentProps {
  settings: ISettings;
  stats: IStats;
  exercise: IExerciseType;
  entries: IHistoryEntry[];
  dispatch: IDispatch;
}

export function ModalEquipmentDock(props: IModalEquipmentContentProps): JSX.Element | null {
  const { gymId, equipmentId } = Equipment_activeIdForExercise(props.settings, props.exercise);
  const data = equipmentId != null ? Equipment_getCurrentGym(props.settings).equipment[equipmentId] : undefined;
  if (equipmentId == null || data == null) {
    return null;
  }
  return (
    <EquipmentEditorDock
      gymId={gymId}
      equipmentId={equipmentId}
      data={data}
      settings={props.settings}
      dispatch={props.dispatch}
    />
  );
}

export function ModalEquipmentContent(props: IModalEquipmentContentProps): JSX.Element {
  const trackClick = useTrackClick();
  const gym = Equipment_getCurrentGym(props.settings);
  const availableEquipment = ObjectUtils_filter(gym.equipment, (k, v) => !v?.isDeleted);
  const { gymId, equipmentId } = Equipment_activeIdForExercise(props.settings, props.exercise);
  const data = equipmentId != null ? availableEquipment[equipmentId] : undefined;
  const programExerciseIds = CollectionUtils_compact(
    props.entries.filter((e) => Exercise_eq(e.exercise, props.exercise)).map((e) => e.programExerciseId)
  );

  return (
    <View data-testid="modal-equipment" testID="modal-equipment" className="px-4 pb-6">
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={equipmentId ?? ""}
        values={[
          ["", "None"],
          ...ObjectUtils_keys(availableEquipment).map<[string, string]>((k) => [
            k,
            equipmentName(k, availableEquipment),
          ]),
        ]}
        onChange={(value) => {
          trackClick("equipment-modal-change");
          EditEquipment_setEquipmentForExercise(
            props.exercise,
            value === "" ? undefined : value,
            programExerciseIds,
            props.dispatch,
            props.settings,
            gymId
          );
        }}
      />
      <View className="flex-row justify-between py-1" style={{ gap: 16 }}>
        {equipmentId != null ? (
          <LinkButton
            className="text-sm"
            name="equipment-copy-this"
            onClick={async () => {
              trackClick("equipment-modal-copy");
              const text = EditEquipment_copyConfirmText(props.settings, gymId, equipmentId, props.exercise);
              if (await Dialog_confirm(text)) {
                EditEquipment_copyForExercise(props.dispatch, props.settings, gymId, equipmentId, props.exercise);
              }
            }}
          >
            Copy this one
          </LinkButton>
        ) : (
          <View />
        )}
        <LinkButton
          className="text-sm"
          name="equipment-new"
          onClick={() => navigateToModal("newEquipmentModal", { gymId, linkExercise: props.exercise })}
        >
          New equipment
        </LinkButton>
      </View>
      <View className="mt-2">
        {equipmentId == null || data == null ? (
          <InputNumber
            type="number"
            label="Default Rounding"
            min={0}
            step={0.5}
            max={100}
            value={Exercise_defaultRounding(props.exercise, props.settings)}
            onUpdate={(value) => EditEquipment_setDefaultRoundingForExercise(props.dispatch, props.exercise, value)}
          />
        ) : (
          <EquipmentEditor
            gymId={gymId}
            equipmentId={equipmentId}
            data={data}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        )}
      </View>
      {equipmentId != null && data != null && (
        <ModalEquipmentRemove
          settings={props.settings}
          gymId={gymId}
          equipmentId={equipmentId}
          exercise={props.exercise}
          dispatch={props.dispatch}
        />
      )}
    </View>
  );
}

function ModalEquipmentRemove(props: {
  settings: ISettings;
  gymId: string;
  equipmentId: string;
  exercise: IExerciseType;
  dispatch: IDispatch;
}): JSX.Element {
  const trackClick = useTrackClick();
  const removal = EditEquipment_removal(props.settings, props.gymId, props.equipmentId, props.exercise);
  return (
    <Pressable
      className="items-center py-3 mt-4"
      testID="equipment-remove"
      data-testid="equipment-remove"
      onPress={async () => {
        trackClick("equipment-modal-remove");
        if (await Dialog_confirm(removal.confirm)) {
          EditEquipment_removeForExercise(
            props.dispatch,
            props.settings,
            props.gymId,
            props.equipmentId,
            props.exercise
          );
        }
      }}
    >
      <Text className="text-sm font-semibold text-text-error">{removal.label}</Text>
    </Pressable>
  );
}
