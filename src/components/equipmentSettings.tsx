import { JSX, Fragment, useState } from "react";
import { View, Pressable, Alert, Platform, LayoutAnimation, UIManager } from "react-native";
import { Text } from "./primitives/text";
import { ILensRecordingPayload, lb, Lens } from "lens-shmens";
import { Weight_build, Weight_eqeq, Weight_compare, Weight_display, Weight_print } from "../models/weight";
import { ISettings, IEquipmentData, IEquipment, IAllEquipment, IUnit, IStats } from "../types";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { CollectionUtils_sort } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { ModalPlates } from "./modalPlates";
import { ModalNewFixedWeight } from "./modalNewFixedWeight";
import { ILensDispatch } from "../utils/useLensReducer";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { equipmentName } from "../models/exercise";
import { ModalNewEquipment } from "./modalNewEquipment";
import { UidFactory_generateUid } from "../utils/generator";
import { Equipment_build } from "../models/equipment";
import { IDispatch } from "../ducks/types";
import { IState } from "../models/state";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { StringUtils_dashcase } from "../utils/string";
import { Stats_getCurrentMovingAverageBodyweight } from "../models/stats";
import { MarkdownEditorBorderless } from "./markdownEditorBorderless";
import { IconEquipmentBarbell } from "./icons/iconEquipmentBarbell";
import { IconEquipmentCable } from "./icons/iconEquipmentCable";
import { IconEquipmentDumbbell } from "./icons/iconEquipmentDumbbell";
import { IconEquipmentEzBar } from "./icons/iconEquipmentEzBar";
import { IconEquipmentKettlebell } from "./icons/iconEquipmentKettlebell";
import { IconEquipmentLeverageMachine } from "./icons/iconEquipmentLeverageMachine";
import { IconEquipmentSmith } from "./icons/iconEquipmentSmith";
import { IconEquipmentTrapbar } from "./icons/iconEquipmentTrapbar";

interface IProps<T> {
  dispatch: IDispatch;
  lensPrefix: Lens<IState, IAllEquipment>;
  expandedEquipment?: IEquipment;
  allEquipment: IAllEquipment;
  settings: ISettings;
  stats: IStats;
}

export const equipmentToIcon: Record<string, () => JSX.Element> = {
  barbell: () => <IconEquipmentBarbell />,
  trapbar: () => <IconEquipmentTrapbar />,
  leverageMachine: () => <IconEquipmentLeverageMachine />,
  smith: () => <IconEquipmentSmith />,
  dumbbell: () => <IconEquipmentDumbbell />,
  ezbar: () => <IconEquipmentEzBar />,
  cable: () => <IconEquipmentCable />,
  kettlebell: () => <IconEquipmentKettlebell />,
};

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
  const hiddenEquipment = ObjectUtils_keys(props.allEquipment).filter((e) => {
    const eq = props.allEquipment[e];
    return !eq?.name && eq?.isDeleted;
  });
  return (
    <View>
      {ObjectUtils_keys(props.allEquipment)
        .filter((e) => !props.allEquipment[e]?.isDeleted)
        .map((bar, i) => {
          const equipmentData = props.allEquipment[bar];
          if (equipmentData) {
            return (
              <View key={bar} className={`${i !== 0 ? "mt-6" : ""}`}>
                <EquipmentSettingsContent
                  lensPrefix={props.lensPrefix}
                  stats={props.stats}
                  allEquipment={props.allEquipment}
                  dispatch={props.dispatch}
                  lensDispatch={lensDispatch}
                  isExpanded={props.expandedEquipment === bar}
                  equipment={bar}
                  equipmentData={equipmentData}
                  settings={props.settings}
                />
              </View>
            );
          } else {
            return undefined;
          }
        })}
      {hiddenEquipment.length > 0 && (
        <View className="flex-row flex-wrap mx-4 my-2">
          <Text className="text-xs">Hidden Equipment: </Text>
          {hiddenEquipment.map((e, i) => (
            <Fragment key={e}>
              {i !== 0 && <Text className="text-xs">, </Text>}
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
            </Fragment>
          ))}
        </View>
      )}
      <View className="m-4">
        <LinkButton className="text-sm" name="add-new-equipment" onClick={() => setModalNewEquipment(true)}>
          Add New Equipment Type
        </LinkButton>
      </View>
      <ModalNewEquipment
        isHidden={!modalNewEquipment}
        onInput={(name) => {
          if (name) {
            const lensRecording = props.lensPrefix.then(lb<IAllEquipment>().get()).recordModify((oldEquipment) => {
              const id = `equipment-${UidFactory_generateUid(8)}`;
              return {
                ...oldEquipment,
                [id]: Equipment_build(name),
              };
            });
            lensDispatch(lensRecording, "Add new equipment");
          }
          setModalNewEquipment(false);
        }}
      />
    </View>
  );
}

interface IEquipmentSettingsContentProps<T> {
  dispatch: IDispatch;
  lensDispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, IAllEquipment>;
  equipment: IEquipment;
  stats: IStats;
  allEquipment: IAllEquipment;
  isExpanded?: boolean;
  equipmentData: IEquipmentData;
  settings: ISettings;
}

function EquipmentSummary(props: { equipmentData: IEquipmentData; settings: ISettings }): JSX.Element {
  const { equipmentData, settings } = props;
  const unit = equipmentData.unit ?? settings.units;

  if (equipmentData.isFixed) {
    const fixedWeights = CollectionUtils_sort(
      equipmentData.fixed.filter((w) => w.unit === unit),
      (a, b) => Weight_compare(a, b)
    );
    if (fixedWeights.length === 0) {
      return <Text className="text-xs text-text-secondary">Fixed weights</Text>;
    }
    const display = fixedWeights.slice(0, 10).map((w) => Weight_print(w));
    return (
      <Text className="text-xs text-text-secondary">
        {display.join(", ")}
        {fixedWeights.length > 10 ? `, and ${fixedWeights.length - 10} more` : ""}
      </Text>
    );
  }

  const barWeight = equipmentData.bar[unit];
  const plates = CollectionUtils_sort(
    equipmentData.plates.filter((p) => p.weight.unit === unit && p.num > 0),
    (a, b) => Weight_compare(b.weight, a.weight)
  );

  const parts: string[] = [];
  if (barWeight && barWeight.value > 0) {
    parts.push(`Bar: ${Weight_print(barWeight)}`);
  }
  if (plates.length > 0) {
    const plateStrs = plates.map((p) => `${Weight_print(p.weight)}×${p.num}`);
    parts.push(plateStrs.join(", "));
  }

  if (parts.length === 0) {
    return <Text className="text-xs text-text-secondary">No plates configured</Text>;
  }
  return <Text className="text-xs text-text-secondary">{parts.join(" · ")}</Text>;
}

function confirmDelete(onConfirm: () => void): void {
  if (Platform.OS === "web") {
    if (confirm("Are you sure?")) {
      onConfirm();
    }
  } else {
    Alert.alert("Confirm", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  }
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function toggleWithAnimation(setter: (fn: (prev: boolean) => boolean) => void): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setter((prev) => !prev);
}

export function EquipmentSettingsContent<T>(props: IEquipmentSettingsContentProps<T>): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(props.isExpanded ?? false);
  const name = equipmentName(props.equipment, props.allEquipment);
  const icon = equipmentToIcon[props.equipment] ? equipmentToIcon[props.equipment]() : undefined;

  return (
    <View>
      <View className="px-2 my-1 border bg-background-default rounded-xl border-border-neutral">
        <View className="flex-row items-center py-2 border-b bg-background-default border-background-subtle" style={{ gap: 4 }}>
          <View className="flex-row items-center">
            <Pressable
              className="px-2"
              testID={`group-header-${StringUtils_dashcase(name)}`}
              data-cy={`group-header-${StringUtils_dashcase(name)}`}
              onPress={() => toggleWithAnimation(setIsExpanded)}
            >
              {isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
            </Pressable>
          </View>
          {icon && <View className="mr-1">{icon}</View>}
          <Pressable className="flex-1" onPress={() => toggleWithAnimation(setIsExpanded)}>
            <Text className="font-semibold">{equipmentName(props.equipment, props.allEquipment)}</Text>
            {!isExpanded && <EquipmentSummary equipmentData={props.equipmentData} settings={props.settings} />}
          </Pressable>
          <View className="flex-row items-center">
            <Pressable
              className="p-2"
              testID={`delete-equipment-${StringUtils_dashcase(name)}`}
              data-cy={`delete-equipment-${StringUtils_dashcase(name)}`}
              onPress={() => {
                const doDelete = (): void => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  const lensRecording = props.lensPrefix
                    .then(lb<IAllEquipment>().pi(props.equipment).p("isDeleted").get())
                    .record(true);
                  props.lensDispatch(lensRecording, "Delete equipment");
                };
                if (!props.equipmentData.name) {
                  doDelete();
                } else {
                  confirmDelete(doDelete);
                }
              }}
            >
              {props.equipmentData.name ? <IconTrash /> : <IconEyeClosed />}
            </Pressable>
          </View>
        </View>
        {isExpanded && (
          <View className="px-2">
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
              stats={props.stats}
              settings={props.settings}
              dispatch={props.dispatch}
              lensDispatch={props.lensDispatch}
              equipmentData={props.equipmentData}
            />
          </View>
        )}
      </View>
    </View>
  );
}

interface IEquipmentSettingsValuesProps<T> {
  lensDispatch: ILensDispatch<T>;
  dispatch: IDispatch;
  lensPrefix: Lens<T, IAllEquipment>;
  equipment: IEquipment;
  stats: IStats;
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
          stats={props.stats}
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
              const newWeight = Weight_build(weight, units);
              const plates =
                props.allEquipment[modalNewPlateEquipmentToShow]?.plates.filter((p) => p.weight.unit === units) || [];
              if (plates.every((p) => !Weight_eqeq(p.weight, newWeight))) {
                const lensRecording = props.lensPrefix
                  .then(lb<IAllEquipment>().pi(modalNewPlateEquipmentToShow).p("plates").get())
                  .recordModify((p) => [...(p || []), { weight: newWeight, num: 2 }]);
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
              const newWeight = Weight_build(weight, units);
              const fixedWeights =
                props.allEquipment[modalNewFixedWeightEquipmentToShow]?.fixed.filter((p) => p.unit === units) || [];
              if (fixedWeights.every((p) => !Weight_eqeq(p, newWeight))) {
                const lensRecording = props.lensPrefix
                  .then(lb<IAllEquipment>().pi(modalNewFixedWeightEquipmentToShow).p("fixed").get())
                  .recordModify((p) => [...(p || []), newWeight]);
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
  const fixed = CollectionUtils_sort(
    equipmentData.fixed.filter((p) => p.unit === units),
    (a, b) => Weight_compare(b, a)
  );
  return (
    <View className="mb-4">
      <GroupHeader
        topPadding={true}
        name={`Available fixed weight for ${equipmentName(props.name, props.allEquipment)}`}
      />
      {fixed.map((weight, i) => {
        return (
          <MenuItem
            key={i}
            name={Weight_display(weight)}
            value={
              <Pressable
                testID="nm-remove-fixed-weight"
                data-cy="nm-remove-fixed-weight"
                onPress={() => {
                  const newFixedWeights = equipmentData.fixed.filter((p) => !Weight_eqeq(p, weight));
                  const lensRecording = props.lensPrefix
                    .then(lb<IAllEquipment>().pi(props.name).p("fixed").get())
                    .record(newFixedWeights);
                  props.dispatch(lensRecording, "Update fixed weights");
                }}
              >
                <IconTrash />
              </Pressable>
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
    </View>
  );
}

interface IEquipmentSettingsPlatesProps<T> {
  dispatch: ILensDispatch<T>;
  lensPrefix: Lens<T, IAllEquipment>;
  allEquipment: IAllEquipment;
  settings: ISettings;
  stats: IStats;
  name: IEquipment;
  setModalNewPlateEquipmentToShow: (equipment: IEquipment) => void;
  equipmentData: IEquipmentData;
}

function EquipmentSettingsPlates<T>(props: IEquipmentSettingsPlatesProps<T>): JSX.Element {
  const { equipmentData, settings } = props;
  const units = equipmentData.unit ?? settings.units;
  const barWeight = equipmentData.bar[units];
  const plates = CollectionUtils_sort(
    equipmentData.plates.filter((p) => p.weight.unit === units),
    (a, b) => Weight_compare(b.weight, a.weight)
  );
  const currentBodyweight = equipmentData.useBodyweightForBar
    ? Stats_getCurrentMovingAverageBodyweight(props.stats, props.settings)
    : undefined;
  return (
    <View className="mb-4">
      {equipmentData.useBodyweightForBar ? (
        <View className="opacity-50">
          <MenuItem name="Bar" value={currentBodyweight != null ? Weight_print(currentBodyweight) : "None"} />
        </View>
      ) : (
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
                .record(Weight_build(v, units));
              props.dispatch(lensRecording, "Change bar weight");
            }
          }}
        />
      )}
      <MenuItemEditable
        name="Bodyweight for Bar"
        type="boolean"
        value={equipmentData.useBodyweightForBar ? "true" : "false"}
        onChange={(newValue?: string) => {
          const lensRecording = props.lensPrefix
            .then(lb<IAllEquipment>().pi(props.name).p("useBodyweightForBar").get())
            .record(newValue === "true");
          props.dispatch(lensRecording, "Toggle bodyweight for bar");
        }}
      />
      <MenuItemEditable
        name="Is assisting?"
        underName={
          <Text className="text-xs text-text-secondary">
            If it should reduce total weight, e.g. for assisted pullups
          </Text>
        }
        type="boolean"
        value={equipmentData.isAssisting ? "true" : "false"}
        onChange={(newValue?: string) => {
          const lensRecording = props.lensPrefix
            .then(lb<IAllEquipment>().pi(props.name).p("isAssisting").get())
            .record(newValue === "true");
          props.dispatch(lensRecording, "Toggle is assisting equipment");
        }}
      />
      <MenuItemEditable
        name="Sides"
        type="number"
        value={equipmentData.multiplier.toString()}
        onChange={(newValue?: string) => {
          const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
          if (v != null) {
            const value = Math.min(Math.max(1, v), 4);
            const lensRecording = [
              props.lensPrefix.then(lb<IAllEquipment>().pi(props.name).p("multiplier").get()).record(value),
              props.lensPrefix.then(lb<IAllEquipment>().pi(props.name).p("plates").get()).recordModify((pl) => {
                if (!pl) {
                  return pl;
                }
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
      <GroupHeader topPadding={true} name="Notes" />
      <View style={{ marginLeft: -4, marginRight: -4 }}>
        <MarkdownEditorBorderless
          debounceMs={500}
          value={equipmentData.notes}
          placeholder={`Hints or equipment specifics in Markdown...`}
          onChange={(v) => {
            const lensRecording = props.lensPrefix.then(lb<IAllEquipment>().pi(props.name).p("notes").get()).record(v);
            props.dispatch(lensRecording, "Update plate");
          }}
        />
      </View>
      <GroupHeader
        topPadding={true}
        name={`Number of ${equipmentName(props.name, props.allEquipment)} plates available`}
      />
      {plates.map((plate) => {
        return (
          <MenuItemEditable
            key={`${plate.weight.value}-${plate.weight.unit}`}
            name={`${plate.weight.value} ${plate.weight.unit}`}
            type="number"
            value={plate.num.toString()}
            hasClear={true}
            onChange={(newValue?: string) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              const lensRecording = props.lensPrefix
                .then(lb<IAllEquipment>().pi(props.name).p("plates").get())
                .recordModify((pl) => {
                  if (!pl) {
                    return pl;
                  }
                  let newPlates;
                  if (v != null) {
                    const num = Math.floor(v / equipmentData.multiplier) * equipmentData.multiplier;
                    newPlates = pl.map((p) => (Weight_eqeq(p.weight, plate.weight) ? { ...p, num } : p));
                  } else {
                    newPlates = pl.filter((p) => !Weight_eqeq(p.weight, plate.weight));
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
    </View>
  );
}
