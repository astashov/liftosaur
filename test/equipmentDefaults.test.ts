import "mocha";
import { expect } from "chai";
import { EquipmentDefaults_build, EquipmentDefaults_inUnit } from "../src/models/equipmentDefaults";
import { EquipmentLegacyDefaults_all } from "../src/models/equipmentLegacyDefaults";
import { Settings_build } from "../src/models/settings";
import { Equipment_getSetup, Equipment_legacyChanged } from "../src/models/equipment";
import { EquipmentSetup_fromLegacy } from "../src/models/equipmentSetup";
import { EquipmentLoadSolver_select } from "../src/models/equipmentLoadSolver";
import { IEquipmentSetup } from "../src/types";

describe("EquipmentDefaults", () => {
  it("gives every built-in a setup, with fixed dumbbells, a cable stack and combinable bands", () => {
    const equipment = EquipmentDefaults_build("lb");
    expect(equipment.dumbbell?.setup).to.eql({
      type: "fixed",
      unit: "lb",
      ranges: [{ from: 5, to: 100, step: 5 }],
      values: [],
    });
    expect(equipment.cable?.setup?.type).to.equal("stack");
    const band = equipment.band?.setup;
    expect(band?.type === "bands" && band.combine).to.equal(true);
    expect(band?.type === "bands" && band.bands.map((b) => b.name)).to.eql(["Yellow", "Red", "Blue", "Green", "Black"]);
    expect(equipment.barbell?.setup).to.eql(EquipmentSetup_fromLegacy(EquipmentLegacyDefaults_all().barbell!, "lb"));
    expect(equipment.kettlebell?.setup?.type).to.equal("fixed");
    for (const [key, entry] of Object.entries(equipment)) {
      expect(entry?.setup, key).to.not.equal(undefined);
      expect(Equipment_legacyChanged(entry!), key).to.equal(false);
    }
  });

  it("builds new accounts in the given unit", () => {
    expect(Settings_build("kg").gyms[0].equipment.barbell?.setup).to.include({ unit: "kg", base: 20 });
    expect(Settings_build().gyms[0].equipment.barbell?.setup).to.include({ unit: "lb", base: 45 });
  });

  it("follows the app unit unless a unit was picked", () => {
    for (const entry of Object.values(EquipmentDefaults_build("kg"))) {
      expect(entry?.unit).to.equal(undefined);
    }
  });

  it("finds the same default in the other unit, typed or built from the old defaults", () => {
    const lb = EquipmentDefaults_build("lb");
    expect(EquipmentDefaults_inUnit("dumbbell", lb.dumbbell!.setup!, "kg")).to.eql(
      EquipmentDefaults_build("kg").dumbbell?.setup
    );
    const oldDumbbell = EquipmentSetup_fromLegacy(EquipmentLegacyDefaults_all().dumbbell!, "lb");
    expect(EquipmentDefaults_inUnit("dumbbell", oldDumbbell, "kg")).to.eql(
      EquipmentSetup_fromLegacy(EquipmentLegacyDefaults_all().dumbbell!, "kg")
    );
    const edited: IEquipmentSetup = { type: "fixed", unit: "lb", ranges: [{ from: 5, to: 50, step: 5 }], values: [] };
    expect(EquipmentDefaults_inUnit("dumbbell", edited, "kg")).to.equal(undefined);
  });

  it("rounds a band exercise to a band combination", () => {
    const settings = Settings_build();
    const setup = Equipment_getSetup(settings.gyms[0].equipment.band!, settings, "lb");
    expect(EquipmentLoadSolver_select(setup, { value: 65, unit: "lb" }, {}).total.value).to.equal(65);
  });
});
