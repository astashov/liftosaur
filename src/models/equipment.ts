import { IEquipment, IEquipmentData } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";

export namespace Equipment {
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
}
