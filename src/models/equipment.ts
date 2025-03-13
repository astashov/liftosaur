import {
  IEquipment,
  IEquipmentData,
  equipments,
  IAllEquipment,
  ISettings,
  IWeight,
  IUnit,
  IExerciseType,
  IGym,
} from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { equipmentName, Exercise } from "./exercise";
import { Weight } from "./weight";

export namespace Equipment {
  export function build(name: string): IEquipmentData {
    return {
      name,
      multiplier: 1,
      bar: {
        lb: Weight.build(0, "lb"),
        kg: Weight.build(0, "kg"),
      },
      plates: [
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(5, "kg"), num: 4 },
      ],
      fixed: [],
      isFixed: false,
    };
  }

  export function getEquipmentOfGym(settings: ISettings, key?: string): IAllEquipment {
    const firstEquipment = settings.gyms[0].equipment;
    if (key != null) {
      return settings.gyms.find((g) => g.id === key)?.equipment ?? firstEquipment;
    } else {
      return firstEquipment;
    }
  }

  export function getCurrentGym(settings: ISettings): IGym {
    return settings.gyms.find((g) => g.id === settings.currentGymId) ?? settings.gyms[0];
  }

  export function getEquipmentIdForExerciseType(settings: ISettings, exerciseType?: IExerciseType): string | undefined {
    if (exerciseType == null) {
      return undefined;
    }

    const exerciseData = settings.exerciseData[Exercise.toKey(exerciseType)];
    const exerciseEquipment = exerciseData?.equipment;
    if (exerciseEquipment == null) {
      return undefined;
    }

    const currentGym = getCurrentGym(settings);
    return exerciseEquipment[currentGym.id];
  }

  export function getEquipmentNameForExerciseType(
    settings: ISettings,
    exerciseType?: IExerciseType
  ): string | undefined {
    const equipment = getEquipmentIdForExerciseType(settings, exerciseType);
    if (equipment == null) {
      return undefined;
    }
    const currentGym = getCurrentGym(settings);
    const name = currentGym.equipment[equipment]?.name;
    return name || equipmentName(equipment);
  }

  export function getEquipmentDataForExerciseType(
    settings: ISettings,
    exerciseType?: IExerciseType
  ): IEquipmentData | undefined {
    if (exerciseType == null) {
      return undefined;
    }

    const exerciseData = settings.exerciseData[Exercise.toKey(exerciseType)];
    const exerciseEquipment = exerciseData?.equipment;
    if (exerciseEquipment == null) {
      return undefined;
    }

    const currentGym = settings.gyms.find((g) => g.id === settings.currentGymId) ?? settings.gyms[0];
    const equipment = exerciseEquipment[currentGym.id];

    return equipment ? currentGym.equipment[equipment] : undefined;
  }

  export function getUnitOrDefaultForExerciseType(settings: ISettings, exerciseType?: IExerciseType): IUnit {
    const equipment = getEquipmentDataForExerciseType(settings, exerciseType);
    return equipment?.unit ?? settings.units;
  }

  export function getUnitForExerciseType(settings: ISettings, exerciseType?: IExerciseType): IUnit | undefined {
    const equipment = getEquipmentDataForExerciseType(settings, exerciseType);
    const equipmentUnit = equipment?.unit;
    return equipmentUnit == null || equipmentUnit === settings.units ? undefined : equipmentUnit;
  }

  export function getEquipmentData(settings: ISettings, key: string): IEquipmentData | undefined {
    return currentEquipment(settings)?.[key];
  }

  export function currentEquipment(settings: ISettings): Partial<Record<IEquipment, IEquipmentData>> {
    const currentGym = settings.gyms.find((g) => g.id === settings.currentGymId) ?? settings.gyms[0];
    return currentGym?.equipment;
  }

  export function smallestPlate(equipmentData: IEquipmentData, unit: IUnit): IWeight {
    return (
      CollectionUtils.sort(
        equipmentData.plates.filter((p) => p.weight.unit === unit),
        (a, b) => Weight.compare(a.weight, b.weight)
      )[0]?.weight || Weight.build(1, unit)
    );
  }

  export function mergeEquipment(
    oldEquipment: { [key in IEquipment]?: IEquipmentData },
    newEquipment: { [key in IEquipment]?: IEquipmentData }
  ): { [key in IEquipment]?: IEquipmentData } {
    const newKeys = Array.from(new Set([...ObjectUtils.keys(newEquipment), ...ObjectUtils.keys(oldEquipment)]));
    return newKeys.reduce<{ [key in IEquipment]?: IEquipmentData }>((acc, name) => {
      const newEquipmentData = newEquipment[name];
      const oldEquipmentData = oldEquipment[name];
      if (newEquipmentData != null && oldEquipmentData == null) {
        acc[name] = newEquipmentData;
      } else if (newEquipmentData == null && oldEquipmentData != null) {
        acc[name] = oldEquipmentData;
      } else if (newEquipmentData != null && oldEquipmentData != null) {
        acc[name] = {
          ...oldEquipmentData,
          bar: newEquipmentData.bar,
          isFixed: newEquipmentData.isFixed,
          plates: CollectionUtils.concatBy(
            oldEquipmentData.plates,
            newEquipmentData.plates,
            (el) => `${el.weight.value}${el.weight.unit}`
          ),
          multiplier: newEquipmentData.multiplier,
          fixed: CollectionUtils.concatBy(
            oldEquipmentData.fixed,
            newEquipmentData.fixed,
            (el) => `${el.value}${el.unit}`
          ),
        };
      }
      return acc;
    }, {});
  }

  export function isBuiltIn(key: string): boolean {
    return (equipments as unknown as string[]).indexOf(key) !== -1;
  }

  export function availableEquipmentNames(equipmentSettings?: IAllEquipment): string[] {
    const equipmentIds = Array.from(new Set([...equipments, ...ObjectUtils.keys(equipmentSettings || {})]));
    return Array.from(new Set([...equipmentIds.map((e) => equipmentName(e))]));
  }

  export function availableEquipmentKeyByNames(equipmentSettings?: IAllEquipment): [string, string][] {
    const equipmentIds = Array.from(new Set([...equipments, ...ObjectUtils.keys(equipmentSettings || {})]));
    return equipmentIds.map((e) => [e, equipmentName(e)]);
  }

  export function customEquipment(equipmentSettings?: IAllEquipment): IAllEquipment {
    return ObjectUtils.filter(equipmentSettings || {}, (key) => !isBuiltIn(key));
  }

  export function equipmentKeyByName(name: string, equipmentSettings?: IAllEquipment): string | undefined {
    const builtInEquipmentKey = equipments.find((eq) => eq === name.toLowerCase());
    if (builtInEquipmentKey) {
      return builtInEquipmentKey;
    }

    const builtInEquipmentName = equipments.find((eq) => equipmentName(eq).toLowerCase() === name.toLowerCase());
    if (builtInEquipmentName) {
      return builtInEquipmentName;
    }

    const customEquipmentKey = ObjectUtils.keys(equipmentSettings || {}).find((eq) => {
      return equipmentName(eq).toLowerCase() === name.toLowerCase();
    });
    return customEquipmentKey;
  }
}
