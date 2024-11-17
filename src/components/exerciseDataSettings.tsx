import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Exercise, equipmentName, IExercise } from "../models/exercise";
import { updateState, IState } from "../models/state";
import { Weight } from "../models/weight";
import { ISettings } from "../types";
import { ObjectUtils } from "../utils/object";
import { ExerciseRM } from "./exerciseRm";
import { GroupHeader } from "./groupHeader";
import { InputNumber } from "./inputNumber";
import { MenuItemEditable } from "./menuItemEditable";
import { EditEquipment } from "../models/editEquipment";

interface IExerciseDataSettingsProps {
  settings: ISettings;
  dispatch: IDispatch;
  programExerciseIds: string[];
  fullExercise: IExercise;
  show1RM: boolean;
}

export function ExerciseDataSettings(props: IExerciseDataSettingsProps): JSX.Element {
  const fullExercise = props.fullExercise;
  const exerciseData = props.settings.exerciseData[Exercise.toKey(fullExercise)] || {};
  const equipmentMap = exerciseData.equipment;

  return (
    <section className="my-2">
      <InputNumber
        type="number"
        label="Default Rounding"
        min={0}
        step={0.5}
        max={100}
        value={Exercise.defaultRounding(fullExercise, props.settings)}
        onUpdate={(value) => {
          EditEquipment.setDefaultRoundingForExercise(props.dispatch, fullExercise, value);
        }}
      />
      <div className="text-xs text-right text-grayv2-main">Used when Equipment is not set</div>
      {props.settings.gyms.length > 1 && (
        <div className="mt-2">
          <GroupHeader name="Equipments for each Gym" />
        </div>
      )}
      {props.settings.gyms.map((gym, i) => {
        const equipment = equipmentMap?.[gym.id];
        const values: [string, string][] = [
          ["", "None"],
          ...ObjectUtils.keys(gym.equipment)
            .filter((e) => !gym.equipment[e]?.isDeleted)
            .map<[string, string]>((id) => [id, equipmentName(id, gym.equipment)]),
        ];
        return (
          <MenuItemEditable
            type="select"
            name={props.settings.gyms.length > 1 ? gym.name : "Equipment"}
            underName={
              props.settings.gyms.length > 1 && props.settings.currentGymId === gym.id ? (
                <div className="text-xs leading-none text-grayv2-main">current</div>
              ) : undefined
            }
            value={equipment ?? ""}
            values={values}
            onChange={(value) => {
              EditEquipment.setEquipmentForExercise(
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
      {props.show1RM && (
        <ExerciseRM
          name="1 Rep Max"
          rmKey="rm1"
          exercise={fullExercise}
          settings={props.settings}
          onEditVariable={(value) => {
            updateState(props.dispatch, [
              lb<IState>()
                .p("storage")
                .p("settings")
                .p("exerciseData")
                .recordModify((data) => {
                  const k = Exercise.toKey(fullExercise);
                  return { ...data, [k]: { ...data[k], rm1: Weight.build(value, props.settings.units) } };
                }),
            ]);
          }}
        />
      )}
    </section>
  );
}
