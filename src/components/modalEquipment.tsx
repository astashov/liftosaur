import React, { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { LftModal } from "./modal";
import { MenuItemEditable } from "./menuItemEditable";
import { Equipment } from "../models/equipment";
import { IExerciseType, IHistoryEntry, ISettings } from "../types";
import { ObjectUtils } from "../utils/object";
import { equipmentName, Exercise } from "../models/exercise";
import { EditEquipment } from "../models/editEquipment";
import { CollectionUtils } from "../utils/collection";
import { InputNumber } from "./inputNumber";
import { EquipmentSettingsValues } from "./equipmentSettings";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IState, updateState } from "../models/state";
import { ILensDispatch } from "../utils/useLensReducer";
import { GroupHeader } from "./groupHeader";

interface IModalEquipmentProps {
  progressId: number;
  settings: ISettings;
  exercise: IExerciseType;
  entries: IHistoryEntry[];
  dispatch: IDispatch;
}

export function ModalEquipment(props: IModalEquipmentProps): JSX.Element {
  const currentEquipment = Equipment.getEquipmentIdForExerciseType(props.settings, props.exercise);
  const programExerciseIds = CollectionUtils.compact(
    props.entries.filter((e) => Exercise.eq(e.exercise, props.exercise)).map((e) => e.programExerciseId)
  );

  const currentGymId = props.settings.currentGymId ?? props.settings.gyms[0].id;
  const availableEquipment = Equipment.getCurrentGym(props.settings).equipment;
  return (
    <LftModal
      isHidden={false}
      onClose={() => {
        updateState(props.dispatch, [
          lb<IState>().p("progress").pi(props.progressId).pi("ui").p("equipmentModal").record(undefined),
        ]);
      }}
      shouldShowClose={true}
      isFullWidth
    >
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={currentEquipment ?? ""}
        values={[
          ["", "None"],
          ...ObjectUtils.keys(availableEquipment).map<[string, string]>((k) => [
            k,
            equipmentName(k, availableEquipment),
          ]),
        ]}
        onChange={(value) => {
          EditEquipment.setEquipmentForExercise(
            props.exercise,
            value === "" ? undefined : value,
            programExerciseIds,
            props.dispatch,
            props.settings
          );
        }}
      />
      <div className="mt-2">
        {currentEquipment == null ? (
          <InputNumber
            type="number"
            label="Default Rounding"
            min={0}
            step={0.5}
            max={100}
            value={Exercise.defaultRounding(props.exercise, props.settings)}
            onUpdate={(value) => {
              EditEquipment.setDefaultRoundingForExercise(props.dispatch, props.exercise, value);
            }}
          />
        ) : (
          <div>
            <GroupHeader name="Equipment Settings" topPadding={true} />
            <EquipmentSettingsValues
              lensDispatch={buildDispatch(props.dispatch)}
              dispatch={props.dispatch}
              lensPrefix={lb<IState>()
                .p("storage")
                .p("settings")
                .p("gyms")
                .findBy("id", currentGymId)
                .p("equipment")
                .get()}
              allEquipment={availableEquipment}
              settings={props.settings}
              equipment={currentEquipment}
              equipmentData={availableEquipment[currentEquipment]!}
            />
          </div>
        )}
      </div>
    </LftModal>
  );
}

function buildDispatch(originalDispatch: IDispatch): ILensDispatch<IState> {
  return (lensRecording: ILensRecordingPayload<IState>[] | ILensRecordingPayload<IState>) => {
    originalDispatch({
      type: "UpdateState",
      lensRecording: Array.isArray(lensRecording) ? lensRecording : [lensRecording],
    });
  };
}
