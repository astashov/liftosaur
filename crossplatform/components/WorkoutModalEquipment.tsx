import type { JSX } from "react";
import { View, Text, ScrollView } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IExerciseType, IHistoryEntry, ISettings, IStats, IEquipment, IAllEquipment, IUnit } from "@shared/types";
import { Equipment_getCurrentGym, Equipment_getEquipmentIdForExerciseType } from "@shared/models/equipment";
import { equipmentName, Exercise_eq } from "@shared/models/exercise";
import { EditEquipment_setEquipmentForExercise } from "@shared/models/editEquipment";
import { ObjectUtils_filter, ObjectUtils_keys } from "@shared/utils/object";
import { CollectionUtils_compact } from "@shared/utils/collection";
import { MenuItemEditable } from "./MenuItemEditable";
import { GroupHeader } from "./GroupHeader";
import { lb } from "lens-shmens";
import type { IState } from "@shared/models/state";

export interface IWorkoutEquipmentContentProps {
  settings: ISettings;
  stats: IStats;
  exercise: IExerciseType;
  entries: IHistoryEntry[];
  dispatch: IDispatch;
}

export function WorkoutEquipmentContent(props: IWorkoutEquipmentContentProps): JSX.Element {
  const availableEquipment = ObjectUtils_filter(Equipment_getCurrentGym(props.settings).equipment, (_k, v) => {
    return !v?.isDeleted;
  });
  let currentEquipment = Equipment_getEquipmentIdForExerciseType(props.settings, props.exercise);
  if (currentEquipment != null && availableEquipment[currentEquipment] == null) {
    currentEquipment = undefined;
  }
  const programExerciseIds = CollectionUtils_compact(
    props.entries.filter((e) => Exercise_eq(e.exercise, props.exercise)).map((e) => e.programExerciseId)
  );

  const equipmentOptions: [string, string][] = [
    ["", "None"],
    ...ObjectUtils_keys(availableEquipment).map<[string, string]>((k) => [
      k,
      equipmentName(k as IEquipment, availableEquipment),
    ]),
  ];

  const currentGymId = props.settings.currentGymId ?? props.settings.gyms[0].id;
  const equipmentData = currentEquipment ? availableEquipment[currentEquipment] : undefined;

  return (
    <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={currentEquipment ?? ""}
        options={equipmentOptions}
        onChange={(value) => {
          EditEquipment_setEquipmentForExercise(
            props.exercise,
            value === "" ? undefined : (value as IEquipment),
            programExerciseIds,
            props.dispatch,
            props.settings
          );
        }}
      />
      {equipmentData && currentEquipment && (
        <View className="mt-2">
          <GroupHeader name="Equipment Settings" />
          <MenuItemEditable
            type="boolean"
            name="Is Fixed Weight"
            value={!!equipmentData.isFixed}
            onChange={(newValue) => {
              props.dispatch({
                type: "UpdateState",
                lensRecording: [
                  lb<IState>()
                    .p("storage")
                    .p("settings")
                    .p("gyms")
                    .findBy("id", currentGymId)
                    .p("equipment")
                    .pi(currentEquipment)
                    .p("isFixed")
                    .record(newValue),
                ],
                desc: "Toggle fixed equipment",
              });
            }}
          />
          <MenuItemEditable
            type="select"
            name="Unit"
            value={equipmentData.unit ?? ""}
            options={[
              ["", "Default"],
              ["lb", "lb"],
              ["kg", "kg"],
            ]}
            onChange={(newValue) => {
              props.dispatch({
                type: "UpdateState",
                lensRecording: [
                  lb<IState>()
                    .p("storage")
                    .p("settings")
                    .p("gyms")
                    .findBy("id", currentGymId)
                    .p("equipment")
                    .pi(currentEquipment)
                    .p("unit")
                    .record((newValue || undefined) as IUnit | undefined),
                ],
                desc: "Change equipment unit",
              });
              props.dispatch({ type: "ApplyProgramChangesToProgress" });
            }}
          />
          {!equipmentData.isFixed && <PlatesList equipmentData={equipmentData} settings={props.settings} />}
        </View>
      )}
    </ScrollView>
  );
}

function PlatesList(props: { equipmentData: NonNullable<IAllEquipment[string]>; settings: ISettings }): JSX.Element {
  const unit = props.equipmentData.unit ?? props.settings.units;
  const plates = (props.equipmentData.plates || []).filter((p) => p.weight.unit === unit);
  const barWeight = props.equipmentData.bar?.[unit];

  return (
    <View className="mt-2">
      {barWeight != null && (
        <View className="flex-row items-center justify-between py-2">
          <Text className="text-sm text-text-secondary">Bar Weight</Text>
          <Text className="text-sm font-semibold text-text-primary">
            {barWeight.value} {barWeight.unit}
          </Text>
        </View>
      )}
      {plates.length > 0 && (
        <>
          <Text className="mt-1 mb-1 text-sm text-text-secondary">Plates (per side)</Text>
          {plates.map((plate) => (
            <View
              key={`${plate.weight.value}-${plate.weight.unit}`}
              className="flex-row items-center justify-between py-1"
            >
              <Text className="text-sm text-text-primary">
                {plate.weight.value} {plate.weight.unit}
              </Text>
              <Text className="text-sm text-text-secondary">× {plate.num}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
