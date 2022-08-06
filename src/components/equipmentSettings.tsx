import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Weight } from "../models/weight";
import { ISettings, IEquipmentData, IEquipment } from "../types";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { SemiButton } from "./semiButton";
import { IconDelete } from "./iconDelete";
import { StringUtils } from "../utils/string";
import { CollectionUtils } from "../utils/collection";

interface IProps {
  dispatch: IDispatch;
  equipment: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
  settings: ISettings;
}

export function EquipmentSettings(props: IProps): JSX.Element {
  return (
    <div>
      <GroupHeader name={StringUtils.capitalize(props.equipment)}>
        <MenuItemEditable
          name="Is Fixed Weight"
          type="boolean"
          value={props.equipmentData.isFixed ? "true" : "false"}
          onChange={(newValue?: string) => {
            const lensRecording = lb<ISettings>()
              .p("equipment")
              .pi(props.equipment)
              .p("isFixed")
              .record(newValue === "true");
            props.dispatch({ type: "UpdateSettings", lensRecording });
          }}
        />
        {props.equipmentData.isFixed ? (
          <EquipmentSettingsFixed
            equipmentData={props.equipmentData}
            setModalNewFixedWeightEquipmentToShow={props.setModalNewFixedWeightEquipmentToShow}
            name={props.equipment}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        ) : (
          <EquipmentSettingsPlates
            equipmentData={props.equipmentData}
            setModalNewPlateEquipmentToShow={props.setModalNewPlateEquipmentToShow}
            name={props.equipment}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        )}
      </GroupHeader>
    </div>
  );
}

interface IEquipmentSettingsFixedProps {
  dispatch: IDispatch;
  name: IEquipment;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  settings: ISettings;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsFixed(props: IEquipmentSettingsFixedProps): JSX.Element {
  const { equipmentData } = props;
  return (
    <>
      <GroupHeader name={`Available fixed weight ${props.name}s`} />
      {equipmentData.fixed.map((weight, i) => {
        return (
          <MenuItem
            key={i}
            name={Weight.display(weight)}
            value={
              <button
                onClick={() => {
                  const newFixedWeights = equipmentData.fixed.filter((p) => !Weight.eqeq(p, weight));
                  const lensRecording = lb<ISettings>()
                    .p("equipment")
                    .pi(props.name)
                    .p("fixed")
                    .record(newFixedWeights);
                  props.dispatch({ type: "UpdateSettings", lensRecording });
                }}
              >
                <IconDelete />
              </button>
            }
          />
        );
      })}
      <SemiButton onClick={() => props.setModalNewFixedWeightEquipmentToShow(props.name)}>+ Add</SemiButton>
    </>
  );
}

interface IEquipmentSettingsPlatesProps {
  dispatch: IDispatch;
  settings: ISettings;
  name: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsPlates(props: IEquipmentSettingsPlatesProps): JSX.Element {
  const { equipmentData, settings } = props;
  const barWeight = equipmentData.bar[settings.units];
  const plates = CollectionUtils.sort(
    equipmentData.plates.filter((p) => p.weight.unit === settings.units),
    (a, b) => Weight.compare(b.weight, a.weight)
  );
  return (
    <>
      <MenuItemEditable
        name="Bar"
        type="number"
        value={barWeight.value.toString()}
        valueUnits={barWeight.unit}
        onChange={(newValue?: string) => {
          const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
          if (v != null) {
            const lensRecording = lb<ISettings>()
              .p("equipment")
              .pi(props.name)
              .p("bar")
              .p(props.settings.units)
              .record(Weight.build(v, props.settings.units));
            props.dispatch({ type: "UpdateSettings", lensRecording });
          }
        }}
      />
      <GroupHeader name={`Number of ${props.name} plates available`} />
      {plates.map((plate) => {
        return (
          <MenuItemEditable
            name={`${plate.weight.value} ${plate.weight.unit}`}
            type="number"
            value={plate.num.toString()}
            hasClear={true}
            onChange={(newValue?: string) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              const lensRecording = lb<ISettings>()
                .p("equipment")
                .pi(props.name)
                .p("plates")
                .recordModify((pl) => {
                  let newPlates;
                  if (v != null) {
                    const num = Math.floor(v / 2) * 2;
                    newPlates = pl.map((p) => (Weight.eqeq(p.weight, plate.weight) ? { ...p, num } : p));
                  } else {
                    newPlates = pl.filter((p) => !Weight.eqeq(p.weight, plate.weight));
                  }
                  return newPlates;
                });
              props.dispatch({ type: "UpdateSettings", lensRecording });
            }}
          />
        );
      })}
      <SemiButton onClick={() => props.setModalNewPlateEquipmentToShow(props.name)}>+ Add</SemiButton>
    </>
  );
}
