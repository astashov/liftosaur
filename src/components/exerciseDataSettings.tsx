import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import {
  equipmentName,
  IExercise,
  Exercise_defaultRounding,
  Exercise_getIsUnilateral,
  Exercise_toKey,
} from "../models/exercise";
import { updateState, IState, updateSettings } from "../models/state";
import { Weight_build } from "../models/weight";
import { ISettings } from "../types";
import { ObjectUtils_keys } from "../utils/object";
import { ExerciseRM } from "./exerciseRm";
import { GroupHeader } from "./groupHeader";
import { InputNumber } from "./inputNumber";
import { MenuItemEditable } from "./menuItemEditable";
import {
  EditEquipment_setDefaultRoundingForExercise,
  EditEquipment_setEquipmentForExercise,
} from "../models/editEquipment";
import { Equipment_getEquipmentIdForExerciseType } from "../models/equipment";

interface IExerciseDataSettingsProps {
  settings: ISettings;
  dispatch: IDispatch;
  programExerciseIds: string[];
  fullExercise: IExercise;
  show1RM: boolean;
}

export function ExerciseDataSettings(props: IExerciseDataSettingsProps): JSX.Element {
  const fullExercise = props.fullExercise;

  return (
    <section className="my-2">
      <InputNumber
        type="number"
        label="Default Rounding"
        min={0}
        step={0.5}
        max={100}
        value={Exercise_defaultRounding(fullExercise, props.settings)}
        onUpdate={(value) => {
          EditEquipment_setDefaultRoundingForExercise(props.dispatch, fullExercise, value);
        }}
      />
      <div className="text-xs text-right text-text-secondary">Used when Equipment is not set</div>
      {props.settings.gyms.length > 1 && (
        <div className="mt-2">
          <GroupHeader name="Equipments for each Gym" />
        </div>
      )}
      {props.settings.gyms.map((gym, i) => {
        const equipment = Equipment_getEquipmentIdForExerciseType(props.settings, props.fullExercise, gym.id);
        const values: [string, string][] = [
          ["", "None"],
          ...ObjectUtils_keys(gym.equipment)
            .filter((e) => !gym.equipment[e]?.isDeleted)
            .map<[string, string]>((id) => [id, equipmentName(id, gym.equipment)]),
        ];
        return (
          <MenuItemEditable
            type="select"
            name={props.settings.gyms.length > 1 ? gym.name : "Equipment"}
            underName={
              props.settings.gyms.length > 1 && props.settings.currentGymId === gym.id ? (
                <div className="text-xs leading-none text-text-secondary">current</div>
              ) : undefined
            }
            value={equipment ?? ""}
            values={values}
            onChange={(value) => {
              EditEquipment_setEquipmentForExercise(
                fullExercise,
                value,
                props.programExerciseIds,
                props.dispatch,
                props.settings,
                gym.id
              );
            }}
          />
        );
      })}
      <MenuItemEditable
        type="boolean"
        name="Is Unilateral"
        value={Exercise_getIsUnilateral(fullExercise, props.settings) ? "true" : "false"}
        onChange={(value) => {
          const isUnilateral = value === "true";
          updateSettings(
            props.dispatch,
            lb<ISettings>()
              .p("exerciseData")
              .recordModify((exerciseData) => {
                const k = Exercise_toKey(fullExercise);
                return { ...exerciseData, [k]: { ...exerciseData[k], isUnilateral } };
              }),
            "Set exercise unilateral setting"
          );
        }}
      />
      {props.show1RM && (
        <ExerciseRM
          name="1 Rep Max"
          rmKey="rm1"
          exercise={fullExercise}
          settings={props.settings}
          onEditVariable={(value) => {
            updateState(
              props.dispatch,
              [
                lb<IState>()
                  .p("storage")
                  .p("settings")
                  .p("exerciseData")
                  .recordModify((data) => {
                    const k = Exercise_toKey(fullExercise);
                    return { ...data, [k]: { ...data[k], rm1: Weight_build(value, props.settings.units) } };
                  }),
              ],
              "Update 1RM for exercise"
            );
          }}
        />
      )}
    </section>
  );
}
