import { IAllEquipment, IEquipmentData, IGym, IUnit } from "../types";
import { Equipment_legacyChanged } from "./equipment";
import { EquipmentDefaults_inUnit } from "./equipmentDefaults";
import {
  EquipmentSetup_convertUnit,
  EquipmentSetup_fromLegacy,
  EquipmentSetup_legacyHash,
  EquipmentSetup_save,
} from "./equipmentSetup";

function mapEquipment(gyms: IGym[], fn: (key: string, entry: IEquipmentData) => IEquipmentData | undefined): IGym[] {
  let isChanged = false;
  const result = gyms.map((gym) => {
    let equipment: IAllEquipment | undefined;
    for (const [key, entry] of Object.entries(gym.equipment)) {
      const next = entry != null ? fn(key, entry) : undefined;
      if (next != null) {
        equipment = { ...(equipment ?? gym.equipment), [key]: next };
      }
    }
    isChanged = isChanged || equipment != null;
    return equipment != null ? { ...gym, equipment } : gym;
  });
  return isChanged ? result : gyms;
}

export function EquipmentUnits_attachSetups(gyms: IGym[], appUnit: IUnit): IGym[] {
  return mapEquipment(gyms, (key, entry) => {
    if (entry.setup != null && !Equipment_legacyChanged(entry)) {
      return undefined;
    }
    const setup = EquipmentSetup_fromLegacy(entry, entry.unit ?? appUnit);
    return { ...entry, setup, setupLegacyHash: EquipmentSetup_legacyHash(entry) };
  });
}

export function EquipmentUnits_follow(gyms: IGym[], appUnit: IUnit): IGym[] {
  return mapEquipment(gyms, (key, entry) => {
    const setup = entry.setup;
    if (setup == null || entry.unit != null || setup.unit === appUnit || Equipment_legacyChanged(entry)) {
      return undefined;
    }
    const next = EquipmentDefaults_inUnit(key, setup, appUnit) ?? EquipmentSetup_convertUnit(setup, appUnit, "convert");
    return EquipmentSetup_save(entry, next);
  });
}
