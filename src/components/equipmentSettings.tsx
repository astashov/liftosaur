import { ILensRecordingPayload, lb, Lens } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { Weight } from "../models/weight";
import { ISettings, IEquipmentData, IEquipment, IAllEquipment, IUnit } from "../types";
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
import { IDispatch } from "../ducks/types";
import { IState } from "../models/state";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { StringUtils } from "../utils/string";

interface IProps<T> {
  dispatch: IDispatch;
  lensPrefix: Lens<IState, IAllEquipment>;
  expandedEquipment?: IEquipment;
  allEquipment: IAllEquipment;
  settings: ISettings;
}

function buildLensDispatch(originalDispatch: IDispatch): ILensDispatch<IState> {
  return (lensRecording: ILensRecordingPayload<IState>[] | ILensRecordingPayload<IState>, desc: string) => {
    originalDispatch({
      type: "UpdateState",
      lensRecording: Array.isArray(lensRecording) ? lensRecording : [lensRecording],
      desc,
    });
  };
}

export function EquipmentSettings<T>(props: IProps<T>): JSX.Element {
  const [modalNewEquipment, setModalNewEquipment] = useState(false);
  const lensDispatch = buildLensDispatch(props.dispatch);
  const hiddenEquipment = ObjectUtils.keys(props.allEquipment).filter((e) => {
    const eq = props.allEquipment[e];
    return !eq?.name && eq?.isDeleted;
  });
  return (
    <div>
      {ObjectUtils.keys(props.allEquipment)
        .filter((e) => !props.allEquipment[e]?.isDeleted)
        .map((bar, i) => {
          const equipmentData = props.allEquipment[bar];
          if (equipmentData) {
            return (
              <div id={bar} className={`${i !== 0 ? "mt-6" : ""}`}>
                <EquipmentSettingsContent
                  key={bar}
                  lensPrefix={props.lensPrefix}
                  allEquipment={props.allEquipment}
                  dispatch={props.dispatch}
                  lensDispatch={lensDispatch}
                  isExpanded={props.expandedEquipment === bar}
                  equipment={bar}
                  equipmentData={equipmentData}
                  settings={props.settings}
                />
              </div>
            );
          } else {
            return undefined;
          }
        })}
      {hiddenEquipment.length > 0 && (
        <div className="mx-4 my-2 leading-4">
          <span className="text-xs">Hidden Equipment: </span>
          {hiddenEquipment.map((e, i) => (
            <>
              {i !== 0 && <span>, </span>}
              <LinkButton
                className="text-xs"
                name={`show-equipment-${e}`}
                onClick={() => {
                  const lensRecording = props.lensPrefix
                    .then(lb<IAllEquipment>().pi(e).p("isDeleted").get())
                    .record(false);
                  lensDispatch(lensRecording, `Show equipment ${e}`);
                }}
              >
                {equipmentName(e, props.allEquipment)}
              </LinkButton>
            </>
          ))}
        </div>
      )}
      <div className="m-4">
        <LinkButton className="text-sm" name="add-new-equipment" onClick={() => setModalNewEquipment(true)}>
          Add New Equipment Type
        </LinkButton>
      </div>
      <ModalNewEquipment
        isHidden={!modalNewEquipment}
        onInput={(name) => {
          if (name) {
            const lensRecording = props.lensPrefix.then(lb<IAllEquipment>().get()).recordModify((oldEquipment) => {
              const id = `equipment-${UidFactory.generateUid(8)}`;
              return {
                ...oldEquipment,
                [id]: Equipment.build(name),
              };
            });
            lensDispatch(lensRecording, "Add new equipment");
          }
          setModalNewEquipment(false);
        }}
      />
    </div>
  );
}

interface IEquipmentSettingsContentProps<T> {
  dispatch: IDispatch;
  lensDispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, IAllEquipment>;
  equipment: IEquipment;
  allEquipment: IAllEquipment;
  isExpanded?: boolean;
  equipmentData: IEquipmentData;
  settings: ISettings;
}

export function EquipmentSettingsContent<T>(props: IEquipmentSettingsContentProps<T>): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(props.isExpanded ?? false);
  const name = equipmentName(props.equipment, props.allEquipment);

  return (
    <div>
      <div className="px-2 my-1 border bg-background-default rounded-xl border-border-neutral">
        <div
          className="sticky left-0 z-10 flex items-center gap-1 py-2 border-b bg-background-default border-background-subtle rounded-t-2xl rounded-w-2xl"
          style={{ top: "3.7rem" }}
        >
          <div className="flex items-center">
            <button
              className="px-2"
              data-cy={`group-header-${StringUtils.dashcase(name)}`}
              onClick={() => {
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
            </button>
          </div>
          <div
            className="flex-1 font-semibold"
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {equipmentName(props.equipment, props.allEquipment)}
          </div>
          <div className="flex items-center">
            <button
              className="p-2"
              data-cy={`delete-equipment-${StringUtils.dashcase(name)}`}
              onClick={() => {
                if (!props.equipmentData.name || confirm("Are you sure?")) {
                  const lensRecording = props.lensPrefix
                    .then(lb<IAllEquipment>().pi(props.equipment).p("isDeleted").get())
                    .record(true);
                  props.lensDispatch(lensRecording, "Delete equipment");
                }
              }}
            >
              {props.equipmentData.name ? <IconTrash /> : <IconEyeClosed />}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="px-2">
            {props.equipmentData.name && (
              <MenuItemEditable
                name="Name"
                type="text"
                value={props.equipmentData.name}
                onChange={(newValue?: string) => {
                  if (newValue) {
                    const lensRecording = props.lensPrefix
                      .then(lb<IAllEquipment>().pi(props.equipment).p("name").get())
                      .record(newValue || undefined);
                    props.lensDispatch(lensRecording, "Change equipment name");
                  }
                }}
              />
            )}
            <EquipmentSettingsValues
              lensPrefix={props.lensPrefix}
              equipment={props.equipment}
              allEquipment={props.allEquipment}
              settings={props.settings}
              dispatch={props.dispatch}
              lensDispatch={props.lensDispatch}
              equipmentData={props.equipmentData}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface IEquipmentSettingsValuesProps<T> {
  lensDispatch: ILensDispatch<T>;
  dispatch: IDispatch;
  lensPrefix: Lens<T, IAllEquipment>;
  equipment: IEquipment;
  allEquipment: IAllEquipment;
  settings: ISettings;
  equipmentData: IEquipmentData;
}

export function EquipmentSettingsValues<T>(props: IEquipmentSettingsValuesProps<T>): JSX.Element {
  const [modalNewPlateEquipmentToShow, setModalNewPlateEquipmentToShow] = useState<IEquipment | undefined>(undefined);
  const [modalNewFixedWeightEquipmentToShow, setModalNewFixedWeightEquipmentToShow] = useState<IEquipment | undefined>(
    undefined
  );
  return (
    <>
      <MenuItemEditable
        name="Is Fixed Weight"
        type="boolean"
        value={props.equipmentData.isFixed ? "true" : "false"}
        onChange={(newValue?: string) => {
          const lensRecording = props.lensPrefix
            .then(lb<IAllEquipment>().pi(props.equipment).p("isFixed").get())
            .record(newValue === "true");
          props.lensDispatch(lensRecording, "Toggle fixed equipment");
        }}
      />
      <MenuItemEditable
        name="Unit"
        type="select"
        value={props.equipmentData.unit ?? ""}
        values={[
          ["", "Default"],
          ["lb", "lb"],
          ["kg", "kg"],
        ]}
        onChange={(newValue?: string) => {
          if (!newValue) {
            newValue = undefined;
          }
          props.lensDispatch(
            props.lensPrefix
              .then(lb<IAllEquipment>().pi(props.equipment).p("unit").get())
              .record(newValue as IUnit | undefined),
            "Change equipment unit"
          );
          props.dispatch({
            type: "ApplyProgramChangesToProgress",
          });
        }}
      />
      {props.equipmentData.isFixed ? (
        <EquipmentSettingsFixed
          lensPrefix={props.lensPrefix}
          equipmentData={props.equipmentData}
          allEquipment={props.allEquipment}
          name={props.equipment}
          settings={props.settings}
          setModalNewFixedWeightEquipmentToShow={setModalNewFixedWeightEquipmentToShow}
          dispatch={props.lensDispatch}
        />
      ) : (
        <EquipmentSettingsPlates
          lensPrefix={props.lensPrefix}
          equipmentData={props.equipmentData}
          allEquipment={props.allEquipment}
          setModalNewPlateEquipmentToShow={setModalNewPlateEquipmentToShow}
          name={props.equipment}
          settings={props.settings}
          dispatch={props.lensDispatch}
        />
      )}
      {modalNewPlateEquipmentToShow != null && (
        <ModalPlates
          isHidden={false}
          units={props.allEquipment[modalNewPlateEquipmentToShow]?.unit ?? props.settings.units}
          onInput={(weight) => {
            setModalNewPlateEquipmentToShow(undefined);
            if (weight != null) {
              const units = props.allEquipment[modalNewPlateEquipmentToShow]?.unit ?? props.settings.units;
              const newWeight = Weight.build(weight, units);
              const plates =
                props.allEquipment[modalNewPlateEquipmentToShow]?.plates.filter((p) => p.weight.unit === units) || [];
              if (plates.every((p) => !Weight.eqeq(p.weight, newWeight))) {
                const lensRecording = props.lensPrefix
                  .then(lb<IAllEquipment>().pi(modalNewPlateEquipmentToShow).p("plates").get())
                  .recordModify((p) => [...p, { weight: newWeight, num: 2 }]);
                props.lensDispatch(lensRecording, "Add plate");
              }
            }
          }}
        />
      )}
      {modalNewFixedWeightEquipmentToShow != null && (
        <ModalNewFixedWeight
          allEquipment={props.allEquipment}
          isHidden={false}
          equipment={modalNewFixedWeightEquipmentToShow}
          units={props.allEquipment[modalNewFixedWeightEquipmentToShow]?.unit ?? props.settings.units}
          onInput={(weight) => {
            setModalNewFixedWeightEquipmentToShow(undefined);
            if (weight != null) {
              const units = props.allEquipment[modalNewFixedWeightEquipmentToShow]?.unit ?? props.settings.units;
              const newWeight = Weight.build(weight, units);
              const fixedWeights =
                props.allEquipment[modalNewFixedWeightEquipmentToShow]?.fixed.filter((p) => p.unit === units) || [];
              if (fixedWeights.every((p) => !Weight.eqeq(p, newWeight))) {
                const lensRecording = props.lensPrefix
                  .then(lb<IAllEquipment>().pi(modalNewFixedWeightEquipmentToShow).p("fixed").get())
                  .recordModify((p) => [...p, newWeight]);
                props.lensDispatch(lensRecording, "Add fixed weight");
              }
            }
          }}
        />
      )}
    </>
  );
}

interface IEquipmentSettingsFixedProps<T> {
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, IAllEquipment>;
  allEquipment: IAllEquipment;
  name: IEquipment;
  setModalNewFixedWeightEquipmentToShow: (equipment: IEquipment) => void;
  settings: ISettings;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsFixed<T>(props: IEquipmentSettingsFixedProps<T>): JSX.Element {
  const { equipmentData } = props;
  const units = equipmentData.unit ?? props.settings.units;
  const fixed = CollectionUtils.sort(
    equipmentData.fixed.filter((p) => p.unit === units),
    (a, b) => Weight.compare(b, a)
  );
  return (
    <div className="mb-4">
      <GroupHeader
        topPadding={true}
        name={`Available fixed weight for ${equipmentName(props.name, props.allEquipment)}`}
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
                    .then(lb<IAllEquipment>().pi(props.name).p("fixed").get())
                    .record(newFixedWeights);
                  props.dispatch(lensRecording, "Update fixed weights");
                }}
              >
                <IconTrash />
              </button>
            }
          />
        );
      })}
      <LinkButton
        className="text-xs"
        name="add-new-fixed-weight"
        onClick={() => props.setModalNewFixedWeightEquipmentToShow(props.name)}
      >
        Add New Fixed Weight
      </LinkButton>
    </div>
  );
}

interface IEquipmentSettingsPlatesProps<T> {
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, IAllEquipment>;
  allEquipment: IAllEquipment;
  settings: ISettings;
  name: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsPlates<T>(props: IEquipmentSettingsPlatesProps<T>): JSX.Element {
  const { equipmentData, settings } = props;
  const units = equipmentData.unit ?? settings.units;
  const barWeight = equipmentData.bar[units];
  const plates = CollectionUtils.sort(
    equipmentData.plates.filter((p) => p.weight.unit === units),
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
              .then(lb<IAllEquipment>().pi(props.name).p("bar").p(units).get())
              .record(Weight.build(v, units));
            props.dispatch(lensRecording, "Change bar weight");
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
              props.lensPrefix.then(lb<IAllEquipment>().pi(props.name).p("multiplier").get()).record(value),
              props.lensPrefix.then(lb<IAllEquipment>().pi(props.name).p("plates").get()).recordModify((pl) => {
                const newPlates = pl.map((plate) => {
                  return {
                    ...plate,
                    num: Math.floor(plate.num / value) * value,
                  };
                });
                return newPlates;
              }),
            ];
            props.dispatch(lensRecording, "Update multiplier");
          }
        }}
      />
      <GroupHeader
        topPadding={true}
        name={`Number of ${equipmentName(props.name, props.allEquipment)} plates available`}
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
                .then(lb<IAllEquipment>().pi(props.name).p("plates").get())
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
              props.dispatch(lensRecording, "Update plate");
            }}
          />
        );
      })}
      <LinkButton
        className="text-sm"
        name="add-new-plate-weight"
        onClick={() => props.setModalNewPlateEquipmentToShow(props.name)}
      >
        Add New Plate Weight
      </LinkButton>
    </div>
  );
}
