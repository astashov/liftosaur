import "mocha";
import { expect } from "chai";
import { EquipmentUnits_attachSetups, EquipmentUnits_follow } from "../src/models/equipmentUnits";
import { EquipmentDefaults_build } from "../src/models/equipmentDefaults";
import { EquipmentLegacyDefaults_all } from "../src/models/equipmentLegacyDefaults";
import { Equipment_legacyChanged, Equipment_setupIn } from "../src/models/equipment";
import { EquipmentSetup_fromLegacy, EquipmentSetup_save } from "../src/models/equipmentSetup";
import { IAllEquipment, IEquipmentData, IGym, IPlatesSetup } from "../src/types";

function gym(equipment: IAllEquipment): IGym {
  return { vtype: "gym", id: "main", name: "Main", equipment };
}

function withoutSetup(entry: IEquipmentData | undefined): Partial<IEquipmentData> {
  const { setup: _setup, setupLegacyHash: _hash, ...rest } = entry ?? ({} as IEquipmentData);
  return rest;
}

const edited: IPlatesSetup = {
  type: "plates",
  unit: "lb",
  base: 45,
  sides: 2,
  plates: [
    { weight: 45, num: 4 },
    { weight: 10, num: 2 },
  ],
  horns: [
    { name: "Top", ratio: 1 },
    { name: "Bottom", ratio: 1 },
  ],
};

describe("EquipmentUnits", () => {
  describe("attaching setups", () => {
    it("reads the same as before and leaves the old fields alone", () => {
      const legacy = EquipmentLegacyDefaults_all();
      const [migrated] = EquipmentUnits_attachSetups([gym(legacy)], "kg");
      for (const [key, entry] of Object.entries(migrated.equipment)) {
        expect(withoutSetup(entry), key).to.eql(legacy[key]);
        expect(entry?.setup, key).to.eql(EquipmentSetup_fromLegacy(legacy[key]!, "kg"));
        expect(Equipment_legacyChanged(entry!), key).to.equal(false);
      }
    });

    it("builds a picked unit in that unit", () => {
      const barbell = { ...EquipmentLegacyDefaults_all().barbell!, unit: "lb" as const };
      const [migrated] = EquipmentUnits_attachSetups([gym({ barbell })], "kg");
      expect(migrated.equipment.barbell?.setup).to.include({ unit: "lb", base: 45 });
    });

    it("rebuilds a setup whose old fields changed and skips the rest", () => {
      const saved = EquipmentSetup_save(EquipmentLegacyDefaults_all().barbell!, edited);
      const changed = { ...saved, multiplier: 1 };
      const gyms = [gym({ barbell: changed, cable: EquipmentDefaults_build("lb").cable })];
      const [migrated] = EquipmentUnits_attachSetups(gyms, "lb");
      expect(migrated.equipment.barbell?.setup).to.eql(EquipmentSetup_fromLegacy(changed, "lb"));
      expect(migrated.equipment.cable).to.equal(gyms[0].equipment.cable);
      expect(EquipmentUnits_attachSetups([migrated], "lb")[0]).to.equal(migrated);
    });
  });

  describe("following the app unit", () => {
    it("swaps defaults to the other unit's defaults", () => {
      const [migrated] = EquipmentUnits_attachSetups([gym(EquipmentLegacyDefaults_all())], "lb");
      const [typed] = [gym(EquipmentDefaults_build("lb"))];
      const [fromOld] = EquipmentUnits_follow([migrated], "kg");
      const [fromTyped] = EquipmentUnits_follow([typed], "kg");
      expect(fromOld.equipment.barbell?.setup).to.eql(
        EquipmentSetup_fromLegacy(EquipmentLegacyDefaults_all().barbell!, "kg")
      );
      expect(fromTyped.equipment.dumbbell?.setup).to.eql(EquipmentDefaults_build("kg").dumbbell?.setup);
      expect(EquipmentUnits_follow([fromTyped], "lb")[0].equipment.dumbbell?.setup).to.eql(
        typed.equipment.dumbbell?.setup
      );
    });

    it("converts edited equipment, and keeps names and hidden flags", () => {
      const barbell = EquipmentSetup_save(
        { ...EquipmentLegacyDefaults_all().barbell!, name: "Rack", isDeleted: true },
        edited
      );
      const [converted] = EquipmentUnits_follow([gym({ barbell })], "kg");
      const entry = converted.equipment.barbell!;
      expect(entry).to.include({ name: "Rack", isDeleted: true });
      expect(entry.unit).to.equal(undefined);
      expect(entry.setup).to.include({ unit: "kg", base: 20 });
      expect(entry.setup?.type === "plates" && entry.setup.plates).to.eql([
        { weight: 20, num: 4 },
        { weight: 5, num: 2 },
      ]);
      expect(entry.setup?.type === "plates" && entry.setup.horns).to.eql(edited.horns);
      expect(Equipment_legacyChanged(entry)).to.equal(false);
    });

    it("leaves picked units and old-build edits alone, and returns the same array after", () => {
      const pinned = { ...EquipmentSetup_save(EquipmentLegacyDefaults_all().barbell!, edited), unit: "lb" as const };
      const pinnedSaved = EquipmentSetup_save(pinned, edited);
      const oldBuildEdit = { ...EquipmentSetup_save(EquipmentLegacyDefaults_all().ezbar!, edited), multiplier: 1 };
      const gyms = [gym({ barbell: pinnedSaved, ezbar: oldBuildEdit })];
      expect(EquipmentUnits_follow(gyms, "kg")).to.equal(gyms);
      expect(Equipment_setupIn(oldBuildEdit, "kg")).to.include({ unit: "kg", sides: 1 });
      const converted = EquipmentUnits_follow([gym(EquipmentDefaults_build("lb"))], "kg");
      expect(EquipmentUnits_follow(converted, "kg")).to.equal(converted);
    });
  });
});
