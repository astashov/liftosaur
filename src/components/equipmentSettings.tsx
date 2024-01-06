import { lb, Lens } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { Weight } from "../models/weight";
import { ISettings, IEquipmentData, IEquipment } from "../types";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { ModalPlates } from "./modalPlates";
import { ModalNewFixedWeight } from "./modalNewFixedWeight";
import { useState } from "preact/hooks";
import { ILensDispatch } from "../utils/useLensReducer";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { equipmentName } from "../models/exercise";
import { ModalNewEquipment } from "./modalNewEquipment";
import { UidFactory } from "../utils/generator";
import { Equipment } from "../models/equipment";

interface IProps<T> {
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, ISettings>;
  expandedEquipment?: IEquipment;
  settings: ISettings;
}

export function EquipmentSettings<T>(props: IProps<T>): JSX.Element {
  const [modalNewPlateEquipmentToShow, setModalNewPlateEquipmentToShow] = useState<IEquipment | undefined>(undefined);
  const [modalNewFixedWeightEquipmentToShow, setModalNewFixedWeightEquipmentToShow] = useState<IEquipment | undefined>(
    undefined
  );
  const [modalNewEquipment, setModalNewEquipment] = useState(false);
  return (
    <>
      {ObjectUtils.keys(props.settings.equipment)
        .filter((e) => !props.settings.equipment[e]?.isDeleted)
        .map((bar, i) => {
          const equipmentData = props.settings.equipment[bar];
          if (equipmentData) {
            return (
              <div
                id={bar}
                className={`${i !== 0 ? "mt-6" : ""} px-4 pt-3 pb-2 ${
                  equipmentData.name ? "border-grayv2-200 border" : "bg-purplev2-100"
                } rounded-2xl`}
              >
                <EquipmentSettingsContent
                  key={bar}
                  lensPrefix={props.lensPrefix}
                  dispatch={props.dispatch}
                  isExpanded={props.expandedEquipment === bar}
                  equipment={bar}
                  setModalNewPlateEquipmentToShow={setModalNewPlateEquipmentToShow}
                  setModalNewFixedWeightEquipmentToShow={setModalNewFixedWeightEquipmentToShow}
                  equipmentData={equipmentData}
                  settings={props.settings}
                />
              </div>
            );
          } else {
            return undefined;
          }
        })}
      <div className="m-4">
        <LinkButton name="add-new-equipment" onClick={() => setModalNewEquipment(true)}>
          Add New Equipment Type
        </LinkButton>
      </div>
      <ModalNewEquipment
        isHidden={!modalNewEquipment}
        onInput={(name) => {
          if (name) {
            const lensRecording = props.lensPrefix
              .then(lb<ISettings>().p("equipment").get())
              .recordModify((oldEquipment) => {
                const id = `equipment-${UidFactory.generateUid(8)}`;
                return {
                  ...oldEquipment,
                  [id]: Equipment.build(name),
                };
              });
            props.dispatch(lensRecording);
          }
          setModalNewEquipment(false);
        }}
      />
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
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, ISettings>;
  equipment: IEquipment;
  isExpanded?: boolean;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
  settings: ISettings;
}

export function EquipmentSettingsContent<T>(props: IEquipmentSettingsContentProps<T>): JSX.Element {
  return (
    <div>
      <GroupHeader
        size="large"
        name={equipmentName(props.equipment, props.settings.equipment)}
        isExpanded={props.isExpanded}
      >
        {props.equipmentData.name && (
          <MenuItemEditable
            name="Name"
            type="text"
            value={props.equipmentData.name}
            onChange={(newValue?: string) => {
              if (newValue) {
                const lensRecording = props.lensPrefix
                  .then(lb<ISettings>().p("equipment").pi(props.equipment).p("name").get())
                  .record(newValue || undefined);
                props.dispatch(lensRecording);
              }
            }}
          />
        )}
        {props.equipmentData.name && (
          <MenuItemEditable
            name="Similar To"
            type="select"
            value={props.equipmentData.similarTo ?? ""}
            values={[
              ["", "None"],
              ...ObjectUtils.keys(props.settings.equipment)
                .filter((e) => props.settings.equipment[e]?.name == null)
                .map<[string, string]>((e) => [e, equipmentName(e, props.settings.equipment)]),
            ]}
            onChange={(newValue?: string) => {
              const lensRecording = props.lensPrefix
                .then(lb<ISettings>().p("equipment").pi(props.equipment).p("similarTo").get())
                .record(newValue || undefined);
              props.dispatch(lensRecording);
            }}
          />
        )}
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
        {props.equipmentData.name && (
          <div className="mt-2 text-right">
            <LinkButton
              name="delete-equipment"
              onClick={() => {
                if (confirm("Are you sure?")) {
                  const lensRecording = props.lensPrefix
                    .then(lb<ISettings>().p("equipment").pi(props.equipment).p("isDeleted").get())
                    .record(true);
                  props.dispatch(lensRecording);
                }
              }}
            >
              Delete {props.equipmentData.name}
            </LinkButton>
          </div>
        )}
      </GroupHeader>
    </div>
  );
}

interface IEquipmentSettingsFixedProps<T> {
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, ISettings>;
  name: IEquipment;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  settings: ISettings;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsFixed<T>(props: IEquipmentSettingsFixedProps<T>): JSX.Element {
  const { equipmentData } = props;
  const fixed = CollectionUtils.sort(
    equipmentData.fixed.filter((p) => p.unit === props.settings.units),
    (a, b) => Weight.compare(b, a)
  );
  return (
    <div className="mb-4">
      <GroupHeader
        topPadding={true}
        name={`Available fixed weight for ${equipmentName(props.name, props.settings.equipment)}`}
      />
      {fixed.map((weight, i) => {
        return (
          <MenuItem
            key={i}
            name={Weight.display(weight)}
            value={
              <button
                className="nm-remove-fixed-weight"
                onClick={() => {
                  const newFixedWeights = equipmentData.fixed.filter((p) => !Weight.eqeq(p, weight));
                  const lensRecording = props.lensPrefix
                    .then(lb<ISettings>().p("equipment").pi(props.name).p("fixed").get())
                    .record(newFixedWeights);
                  props.dispatch(lensRecording);
                }}
              >
                <IconTrash />
              </button>
            }
          />
        );
      })}
      <LinkButton name="add-new-fixed-weight" onClick={() => props.setModalNewFixedWeightEquipmentToShow(props.name)}>
        Add New Fixed Weight
      </LinkButton>
    </div>
  );
}

interface IEquipmentSettingsPlatesProps<T> {
  dispatch: ILensDispatch<T>;
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
    <div className="mb-4">
      <MenuItemEditable
        name="Bar"
        type="number"
        value={barWeight.value.toString()}
        valueUnits={barWeight.unit}
        onChange={(newValue?: string) => {
          const v = newValue != null && newValue !== "" ? parseFloat(newValue) : null;
          if (v != null) {
            const lensRecording = props.lensPrefix
              .then(lb<ISettings>().p("equipment").pi(props.name).p("bar").p(props.settings.units).get())
              .record(Weight.build(v, props.settings.units));
            props.dispatch(lensRecording);
          }
        }}
      />
      <MenuItemEditable
        name="Sides"
        type="number"
        value={equipmentData.multiplier.toString()}
        onChange={(newValue?: string) => {
          const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
          if (v != null) {
            const value = Math.min(Math.max(1, v), 2);
            const lensRecording = [
              props.lensPrefix.then(lb<ISettings>().p("equipment").pi(props.name).p("multiplier").get()).record(value),
              props.lensPrefix
                .then(lb<ISettings>().p("equipment").pi(props.name).p("plates").get())
                .recordModify((pl) => {
                  const newPlates = pl.map((plate) => {
                    return {
                      ...plate,
                      num: Math.floor(plate.num / value) * value,
                    };
                  });
                  return newPlates;
                }),
            ];
            props.dispatch(lensRecording);
          }
        }}
      />
      <GroupHeader
        topPadding={true}
        name={`Number of ${equipmentName(props.name, props.settings.equipment)} plates available`}
      />
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
                    const num = Math.floor(v / equipmentData.multiplier) * equipmentData.multiplier;
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
      <LinkButton name="add-new-plate-weight" onClick={() => props.setModalNewPlateEquipmentToShow(props.name)}>
        Add New Plate Weight
      </LinkButton>
    </div>
  );
}
