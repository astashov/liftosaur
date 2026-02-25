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
import { CollectionUtils_sort, CollectionUtils_concatBy } from "../utils/collection";
import { ObjectUtils_keys, ObjectUtils_filter } from "../utils/object";
import { equipmentName, Exercise_toKey } from "./exercise";
import { Weight_build, Weight_compare } from "./weight";

export function Equipment_build(name: string): IEquipmentData {
  return {
    vtype: "equipment_data",
    name,
    multiplier: 1,
    bar: {
      lb: Weight_build(0, "lb"),
      kg: Weight_build(0, "kg"),
    },
    plates: [
      { weight: Weight_build(10, "lb"), num: 4 },
      { weight: Weight_build(5, "kg"), num: 4 },
    ],
    fixed: [],
    isFixed: false,
  };
}

export function Equipment_getEquipmentOfGym(settings: ISettings, key?: string): IAllEquipment {
  const firstEquipment = settings.gyms[0].equipment;
  if (key != null) {
    return settings.gyms.find((g) => g.id === key)?.equipment ?? firstEquipment;
  } else {
    return firstEquipment;
  }
}

export function Equipment_getGymByIdOrCurrent(settings: ISettings, gymId?: string): IGym {
  return settings.gyms.find((g) => g.id === (gymId ?? settings.currentGymId)) ?? settings.gyms[0];
}

export function Equipment_getCurrentGym(settings: ISettings): IGym {
  return settings.gyms.find((g) => g.id === settings.currentGymId) ?? settings.gyms[0];
}

export function Equipment_getEquipmentIdForExerciseType(
  settings: ISettings,
  exerciseType?: IExerciseType,
  gymId?: string
): string | undefined {
  if (exerciseType == null) {
    return undefined;
  }

  const key = Exercise_toKey(exerciseType);
  if (
    !(
      settings.exerciseData[key] &&
      ("equipment" in settings.exerciseData[key] || "rounding" in settings.exerciseData[key])
    )
  ) {
    return exerciseType.equipment;
  }
  const exerciseData = settings.exerciseData[key];
  const exerciseEquipment = exerciseData?.equipment;
  if (exerciseEquipment == null) {
    return undefined;
  }

  const currentGym = Equipment_getGymByIdOrCurrent(settings, gymId);
  return exerciseEquipment[currentGym.id];
}

export function Equipment_getEquipmentNameForExerciseType(
  settings: ISettings,
  exerciseType?: IExerciseType
): string | undefined {
  const equipment = Equipment_getEquipmentIdForExerciseType(settings, exerciseType);
  if (equipment == null) {
    return undefined;
  }
  const currentGym = Equipment_getCurrentGym(settings);
  const gymEquipment = currentGym.equipment[equipment];
  if (gymEquipment == null || gymEquipment.isDeleted) {
    return undefined;
  }
  const name = gymEquipment.name;
  return name || equipmentName(equipment);
}

export function Equipment_getEquipmentDataForExerciseType(
  settings: ISettings,
  exerciseType?: IExerciseType
): IEquipmentData | undefined {
  const equipment = Equipment_getEquipmentIdForExerciseType(settings, exerciseType);
  const currentGym = Equipment_getCurrentGym(settings);
  return equipment ? currentGym.equipment[equipment] : undefined;
}

export function Equipment_getUnitOrDefaultForExerciseType(settings: ISettings, exerciseType?: IExerciseType): IUnit {
  const equipment = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  return equipment?.unit ?? settings.units;
}

export function Equipment_getUnitForExerciseType(settings: ISettings, exerciseType?: IExerciseType): IUnit | undefined {
  const equipment = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  const equipmentUnit = equipment?.unit;
  return equipmentUnit == null || equipmentUnit === settings.units ? undefined : equipmentUnit;
}

export function Equipment_getEquipmentData(settings: ISettings, key: string): IEquipmentData | undefined {
  return Equipment_currentEquipment(settings)?.[key];
}

export function Equipment_currentEquipment(settings: ISettings): IAllEquipment {
  const currentGym = settings.gyms.find((g) => g.id === settings.currentGymId) ?? settings.gyms[0];
  return currentGym?.equipment;
}

export function Equipment_smallestPlate(equipmentData: IEquipmentData, unit: IUnit): IWeight {
  return (
    CollectionUtils_sort(
      equipmentData.plates.filter((p) => p.weight.unit === unit),
      (a, b) => Weight_compare(a.weight, b.weight)
    )[0]?.weight || Weight_build(1, unit)
  );
}

export function Equipment_mergeEquipment(
  oldEquipment: { [key in IEquipment]?: IEquipmentData },
  newEquipment: { [key in IEquipment]?: IEquipmentData }
): { [key in IEquipment]?: IEquipmentData } {
  const newKeys = Array.from(new Set([...ObjectUtils_keys(newEquipment), ...ObjectUtils_keys(oldEquipment)]));
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
        plates: CollectionUtils_concatBy(
          oldEquipmentData.plates,
          newEquipmentData.plates,
          (el) => `${el.weight.value}${el.weight.unit}`
        ),
        multiplier: newEquipmentData.multiplier,
        fixed: CollectionUtils_concatBy(
          oldEquipmentData.fixed,
          newEquipmentData.fixed,
          (el) => `${el.value}${el.unit}`
        ),
      };
    }
    return acc;
  }, {});
}

export function Equipment_isBuiltIn(key: string): boolean {
  return (equipments as unknown as string[]).indexOf(key) !== -1;
}

export function Equipment_customEquipment(equipmentSettings?: IAllEquipment): IAllEquipment {
  return ObjectUtils_filter(equipmentSettings || {}, (key) => !Equipment_isBuiltIn(key));
}

export function Equipment_equipmentKeyByName(name: string, equipmentSettings?: IAllEquipment): string | undefined {
  const builtInEquipmentKey = equipments.find((eq) => eq === name.toLowerCase());
  if (builtInEquipmentKey) {
    return builtInEquipmentKey;
  }

  const builtInEquipmentName = equipments.find((eq) => equipmentName(eq).toLowerCase() === name.toLowerCase());
  if (builtInEquipmentName) {
    return builtInEquipmentName;
  }

  const customEquipmentKey = ObjectUtils_keys(equipmentSettings || {}).find((eq) => {
    return equipmentName(eq).toLowerCase() === name.toLowerCase();
  });
  return customEquipmentKey;
}
