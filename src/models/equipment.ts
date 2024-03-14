import { IEquipment, IEquipmentData, equipments, IAllEquipment } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { equipmentName } from "./exercise";
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
    return ((equipments as unknown) as string[]).indexOf(key) !== -1;
  }

  export function availableEquipmentNames(equipmentSettings?: IAllEquipment): string[] {
    const equipmentIds = Array.from(new Set([...equipments, ...ObjectUtils.keys(equipmentSettings || {})]));
    return Array.from(new Set([...equipmentIds.map((e) => equipmentName(e, equipmentSettings || {}))]));
  }

  export function availableEquipmentKeyByNames(equipmentSettings?: IAllEquipment): [string, string][] {
    const equipmentIds = Array.from(new Set([...equipments, ...ObjectUtils.keys(equipmentSettings || {})]));
    return equipmentIds.map((e) => [e, equipmentName(e, equipmentSettings || {})]);
  }

  export function customEquipment(equipmentSettings?: IAllEquipment): IAllEquipment {
    return ObjectUtils.filter(equipmentSettings || {}, (key) => !isBuiltIn(key));
  }

  export function equipmentKeyByName(name: string, equipmentSettings?: IAllEquipment): string | undefined {
    const builtInEquipmentKey = equipments.find((eq) => eq === name.toLowerCase());
    if (builtInEquipmentKey) {
      return builtInEquipmentKey;
    }

    const builtInEquipmentName = equipments.find(
      (eq) => equipmentName(eq, equipmentSettings).toLowerCase() === name.toLowerCase()
    );
    if (builtInEquipmentName) {
      return builtInEquipmentName;
    }

    const customEquipmentKey = ObjectUtils.keys(equipmentSettings || {}).find((eq) => {
      return equipmentName(eq, equipmentSettings).toLowerCase() === name.toLowerCase();
    });
    return customEquipmentKey;
  }
}
