import { lb, Lens } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { Weight } from "../models/weight";
import { ISettings, IEquipmentData, IEquipment } from "../types";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { SemiButton } from "./semiButton";
import { IconDelete } from "./iconDelete";
import { StringUtils } from "../utils/string";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { ModalPlates } from "./modalPlates";
import { ModalNewFixedWeight } from "./modalNewFixedWeight";
import { useState } from "preact/hooks";
import { ILensDispatchSimple } from "../utils/useLensReducer";

interface IProps<T> {
  dispatch: ILensDispatchSimple<T>;
  lensPrefix: Lens<T, ISettings>;
  settings: ISettings;
}

export function EquipmentSettings<T>(props: IProps<T>): JSX.Element {
  const [modalNewPlateEquipmentToShow, setModalNewPlateEquipmentToShow] = useState<IEquipment | undefined>(undefined);
  const [modalNewFixedWeightEquipmentToShow, setModalNewFixedWeightEquipmentToShow] = useState<IEquipment | undefined>(
    undefined
  );
  return (
    <>
      {ObjectUtils.keys(props.settings.equipment).map((bar) => {
        const equipmentData = props.settings.equipment[bar];
        if (equipmentData) {
          return (
            <EquipmentSettingsContent
              key={bar}
              lensPrefix={props.lensPrefix}
              dispatch={props.dispatch}
              equipment={bar}
              setModalNewPlateEquipmentToShow={setModalNewPlateEquipmentToShow}
              setModalNewFixedWeightEquipmentToShow={setModalNewFixedWeightEquipmentToShow}
              equipmentData={equipmentData}
              settings={props.settings}
            />
          );
        } else {
          return undefined;
        }
      })}
      <ModalPlates
        isHidden={modalNewPlateEquipmentToShow == null}
        units={props.settings.units}
        onInput={(weight) => {
          setModalNewPlateEquipmentToShow(undefined);
          if (weight != null && modalNewPlateEquipmentToShow != null) {
            const newWeight = Weight.build(weight, props.settings.units);
            const plates =
              props.settings.equipment[modalNewPlateEquipmentToShow]?.plates.filter(
                (p) => p.weight.unit === props.settings.units
              ) || [];
            if (plates.every((p) => !Weight.eqeq(p.weight, newWeight))) {
              const lensRecording = props.lensPrefix
                .then(lb<ISettings>().p("equipment").pi(modalNewPlateEquipmentToShow).p("plates").get())
                .recordModify((p) => [...p, { weight: newWeight, num: 2 }]);
              props.dispatch(lensRecording);
            }
          }
        }}
      />
      <ModalNewFixedWeight
        isHidden={modalNewFixedWeightEquipmentToShow == null}
        equipment={modalNewFixedWeightEquipmentToShow || "barbell"}
        units={props.settings.units}
        onInput={(weight) => {
          setModalNewFixedWeightEquipmentToShow(undefined);
          if (weight != null && modalNewFixedWeightEquipmentToShow != null) {
            const newWeight = Weight.build(weight, props.settings.units);
            const fixedWeights =
              props.settings.equipment[modalNewFixedWeightEquipmentToShow]?.fixed.filter(
                (p) => p.unit === props.settings.units
              ) || [];
            if (fixedWeights.every((p) => !Weight.eqeq(p, newWeight))) {
              const lensRecording = props.lensPrefix
                .then(lb<ISettings>().p("equipment").pi(modalNewFixedWeightEquipmentToShow).p("fixed").get())
                .recordModify((p) => [...p, newWeight]);
              props.dispatch(lensRecording);
            }
          }
        }}
      />
    </>
  );
}

interface IEquipmentSettingsContentProps<T> {
  dispatch: ILensDispatchSimple<T>;
  lensPrefix: Lens<T, ISettings>;
  equipment: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
  settings: ISettings;
}

export function EquipmentSettingsContent<T>(props: IEquipmentSettingsContentProps<T>): JSX.Element {
  return (
    <div>
      <GroupHeader name={StringUtils.capitalize(props.equipment)}>
        <MenuItemEditable
          name="Is Fixed Weight"
          type="boolean"
          value={props.equipmentData.isFixed ? "true" : "false"}
          onChange={(newValue?: string) => {
            const lensRecording = props.lensPrefix
              .then(lb<ISettings>().p("equipment").pi(props.equipment).p("isFixed").get())
              .record(newValue === "true");
            props.dispatch(lensRecording);
          }}
        />
        {props.equipmentData.isFixed ? (
          <EquipmentSettingsFixed
            lensPrefix={props.lensPrefix}
            equipmentData={props.equipmentData}
            setModalNewFixedWeightEquipmentToShow={props.setModalNewFixedWeightEquipmentToShow}
            name={props.equipment}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        ) : (
          <EquipmentSettingsPlates
            lensPrefix={props.lensPrefix}
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

interface IEquipmentSettingsFixedProps<T> {
  dispatch: ILensDispatchSimple<T>;
  lensPrefix: Lens<T, ISettings>;
  name: IEquipment;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  settings: ISettings;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsFixed<T>(props: IEquipmentSettingsFixedProps<T>): JSX.Element {
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
                  const lensRecording = props.lensPrefix
                    .then(lb<ISettings>().p("equipment").pi(props.name).p("fixed").get())
                    .record(newFixedWeights);
                  props.dispatch(lensRecording);
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

interface IEquipmentSettingsPlatesProps<T> {
  dispatch: ILensDispatchSimple<T>;
  lensPrefix: Lens<T, ISettings>;
  settings: ISettings;
  name: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsPlates<T>(props: IEquipmentSettingsPlatesProps<T>): JSX.Element {
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
            const lensRecording = props.lensPrefix
              .then(lb<ISettings>().p("equipment").pi(props.name).p("bar").p(props.settings.units).get())
              .record(Weight.build(v, props.settings.units));
            props.dispatch(lensRecording);
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
              const lensRecording = props.lensPrefix
                .then(lb<ISettings>().p("equipment").pi(props.name).p("plates").get())
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
              props.dispatch(lensRecording);
            }}
          />
        );
      })}
      <SemiButton onClick={() => props.setModalNewPlateEquipmentToShow(props.name)}>+ Add</SemiButton>
    </>
  );
}
