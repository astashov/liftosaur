import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { Equipment_getEquipmentDataForExerciseType, Equipment_getSetup } from "../src/models/equipment";
import { EquipmentLoadSolver_select } from "../src/models/equipmentLoadSolver";
import {
  EquipmentSetup_convertUnit,
  EquipmentSetup_save,
  EquipmentSetup_summary,
  EquipmentSetup_toLegacy,
} from "../src/models/equipmentSetup";
import { IEquipmentData, IEquipmentSetup, IExerciseType, ISettings, IUnit, IWeight } from "../src/types";
import { LegacyPlates_calculate } from "./legacyPlates";

function w(value: number, unit: IUnit): IWeight {
  return { value, unit };
}

const targets = [0, 2.5, 5, 12.5, 20, 45, 47.5, 61, 100, 135, 137.5, 186, 225, 300, 405, 1000, -20, -47.5];

function newTotal(settings: ISettings, target: IWeight, exerciseType: IExerciseType): IWeight {
  const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
  const setup = Equipment_getSetup(data, settings, target.unit);
  return EquipmentLoadSolver_select(setup, target, { bodyweight: settings.currentBodyweight }).total;
}

function expectParity(settings: ISettings, equipment: string, unit: IUnit): void {
  const exerciseType: IExerciseType = { id: "squat", equipment };
  for (const value of targets) {
    const target = w(value, unit);
    const legacy = LegacyPlates_calculate(target, settings, unit, exerciseType).totalWeight;
    expect(newTotal(settings, target, exerciseType), `${equipment} ${value}${unit}`).to.eql(legacy);
  }
}

function settingsWith(equipment: string, change: Partial<IEquipmentData>, bodyweight?: IWeight): ISettings {
  const settings = Settings_build();
  settings.gyms[0].equipment[equipment] = { ...settings.gyms[0].equipment[equipment]!, ...change };
  settings.currentBodyweight = bodyweight;
  return settings;
}

function settingsWithSetup(setup: IEquipmentSetup): { settings: ISettings; exerciseType: IExerciseType } {
  const settings = Settings_build();
  settings.gyms[0].equipment.custom = EquipmentSetup_save(
    { ...settings.gyms[0].equipment.barbell!, name: "Custom" },
    setup
  );
  return { settings, exerciseType: { id: "squat", equipment: "custom" } };
}

describe("EquipmentSetup", () => {
  describe("parity with the old plate solver", () => {
    const defaults = ["barbell", "trapbar", "smith", "leverageMachine", "ezbar", "dumbbell", "cable", "kettlebell"];
    for (const equipment of defaults) {
      for (const unit of ["lb", "kg"] as const) {
        it(`matches on default ${equipment} in ${unit}`, () => {
          expectParity(Settings_build(), equipment, unit);
        });
      }
    }

    it("matches with bodyweight replacing the bar", () => {
      expectParity(
        settingsWith("leverageMachine", { useBodyweightForBar: true }, w(80, "kg")),
        "leverageMachine",
        "kg"
      );
      expectParity(settingsWith("barbell", { useBodyweightForBar: true }, w(176, "lb")), "barbell", "lb");
    });

    it("matches with bodyweight turned on but not logged", () => {
      expectParity(settingsWith("barbell", { useBodyweightForBar: true }), "barbell", "lb");
    });

    it("matches on assisting with bodyweight", () => {
      const change = { useBodyweightForBar: true, isAssisting: true };
      expectParity(settingsWith("leverageMachine", change, w(80, "kg")), "leverageMachine", "kg");
      expectParity(settingsWith("leverageMachine", change, w(176, "lb")), "leverageMachine", "lb");
    });

    it("matches on assisting with bodyweight typed into the bar", () => {
      const change = { isAssisting: true, bar: { lb: w(176, "lb"), kg: w(80, "kg") } };
      expectParity(settingsWith("leverageMachine", change), "leverageMachine", "kg");
    });

    it("matches with three or four sides", () => {
      expectParity(settingsWith("barbell", { multiplier: 3 }), "barbell", "lb");
      expectParity(settingsWith("barbell", { multiplier: 4 }), "barbell", "kg");
    });

    it("matches lb kettlebells rounded for a kg set", () => {
      const fixed = [20, 40, 60].map((value) => w(value, "lb"));
      expectParity(settingsWith("kettlebell", { unit: "lb", fixed }), "kettlebell", "kg");
    });
  });

  describe("old fields for assisted setups", () => {
    function expectOldSolverMatches(setup: IEquipmentSetup, values: number[], bodyweight?: IWeight): void {
      const settings = Settings_build();
      settings.currentBodyweight = bodyweight;
      settings.gyms[0].equipment.custom = { ...settings.gyms[0].equipment.barbell!, ...EquipmentSetup_toLegacy(setup) };
      const exerciseType: IExerciseType = { id: "squat", equipment: "custom" };
      for (const value of values) {
        const target = w(value, setup.unit);
        const legacy = LegacyPlates_calculate(target, settings, setup.unit, exerciseType).totalWeight;
        expect(EquipmentLoadSolver_select(setup, target, { bodyweight }).total, `${value}`).to.eql(legacy);
      }
    }

    it("writes assistance only as negative weights for the old solver", () => {
      const setup: IEquipmentSetup = {
        type: "stack",
        unit: "kg",
        ranges: [{ from: 10, to: 150, step: 10 }],
        direction: "assists",
      };
      expectOldSolverMatches(setup, [-20, -25, -40, -150]);
    });

    it("writes bodyweight minus assistance for the old solver", () => {
      const setup: IEquipmentSetup = {
        type: "stack",
        unit: "kg",
        ranges: [{ from: 10, to: 150, step: 10 }],
        direction: "assists",
        bodyweight: {},
      };
      expectOldSolverMatches(setup, [20, 55, 60, 70], w(80, "kg"));
    });
  });

  describe("old fields written for older app versions", () => {
    const cases: [string, IEquipmentSetup][] = [
      [
        "one-horn plates",
        {
          type: "plates",
          unit: "lb",
          base: 45,
          plates: [
            { weight: 45, num: 4 },
            { weight: 5, num: 4 },
          ],
          sides: 2,
        },
      ],
      ["half-ratio stack", { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }], pullRatio: 0.5 }],
      ["stack with base", { type: "stack", unit: "kg", base: 3, ranges: [{ from: 5, to: 60, step: 5 }] }],
      ["electric", { type: "electric", unit: "lb", min: 5, max: 200, step: 1 }],
      ["fixed", { type: "fixed", unit: "kg", ranges: [{ from: 2.5, to: 25, step: 2.5 }], values: [27.5] }],
    ];
    for (const [name, setup] of cases) {
      it(`gives the old solver the same totals for ${name}`, () => {
        const settings = Settings_build();
        settings.gyms[0].equipment.custom = {
          ...settings.gyms[0].equipment.barbell!,
          ...EquipmentSetup_toLegacy(setup),
        };
        const exerciseType: IExerciseType = { id: "squat", equipment: "custom" };
        for (const value of targets.filter((t) => t > 0)) {
          const target = w(value, setup.unit);
          const legacy = LegacyPlates_calculate(target, settings, setup.unit, exerciseType).totalWeight;
          expect(EquipmentLoadSolver_select(setup, target, {}).total, `${name} ${value}`).to.eql(legacy);
        }
      });
    }
  });

  describe("save and the old-field hash", () => {
    const stack: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };

    it("uses the saved setup while the old fields match", () => {
      const { settings, exerciseType } = settingsWithSetup(stack);
      const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
      expect(Equipment_getSetup(data, settings, "lb")).to.eql(stack);
      expect(Equipment_getSetup({ ...data, name: "Renamed", notes: "Seat 4" }, settings, "lb")).to.eql(stack);
    });

    it("uses the old fields once something else changed them", () => {
      const { settings, exerciseType } = settingsWithSetup(stack);
      const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
      const edited = { ...data, plates: [{ weight: w(25, "lb"), num: 2 }] };
      expect(Equipment_getSetup(edited, settings, "lb").type).to.equal("plates");
    });
  });

  describe("unit conversion", () => {
    const barbell: IEquipmentSetup = {
      type: "plates",
      unit: "lb",
      base: 45,
      plates: [
        { weight: 45, num: 8 },
        { weight: 25, num: 4 },
        { weight: 10, num: 4 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
      ],
      sides: 2,
    };

    it("maps plates to their kg equivalents", () => {
      expect(EquipmentSetup_convertUnit(barbell, "kg", "convert")).to.eql({
        ...barbell,
        unit: "kg",
        base: 20,
        plates: [
          { weight: 20, num: 8 },
          { weight: 10, num: 4 },
          { weight: 5, num: 4 },
          { weight: 2.5, num: 4 },
          { weight: 1.25, num: 4 },
        ],
      });
    });

    it("returns the original after lb to kg to lb", () => {
      const back = EquipmentSetup_convertUnit(EquipmentSetup_convertUnit(barbell, "kg", "convert"), "lb", "convert");
      expect(back).to.eql(barbell);
    });

    it("merges plates that land on the same size", () => {
      const setup: IEquipmentSetup = {
        ...barbell,
        plates: [
          { weight: 35, num: 2 },
          { weight: 33, num: 2 },
        ],
      };
      expect(
        EquipmentSetup_convertUnit(setup, "kg", "convert").type === "plates" &&
          (EquipmentSetup_convertUnit(setup, "kg", "convert") as { plates: unknown }).plates
      ).to.eql([{ weight: 15, num: 4 }]);
    });

    it("converts a stack and keeps uneven rows connected", () => {
      const simple: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
      expect(EquipmentSetup_convertUnit(simple, "kg", "convert")).to.eql({
        ...simple,
        unit: "kg",
        ranges: [{ from: 5, to: 90, step: 5 }],
      });
      const uneven: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        ranges: [
          { from: 15, to: 25, step: 5 },
          { from: 25, to: 55, step: 10 },
          { from: 55, to: 190, step: 15 },
        ],
      };
      const converted = EquipmentSetup_convertUnit(uneven, "kg", "convert");
      const ranges = converted.type === "stack" ? converted.ranges : [];
      expect(ranges[1].from).to.equal(ranges[0].to);
      expect(ranges[2].from).to.equal(ranges[1].to);
    });

    it("only changes the unit when relabeling", () => {
      expect(EquipmentSetup_convertUnit(barbell, "kg", "relabel")).to.eql({ ...barbell, unit: "kg" });
    });
  });

  describe("summary", () => {
    it("describes a cable stack in one line", () => {
      const setup: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        ranges: [{ from: 10, to: 200, step: 10 }],
        builtin: [5, 10],
        pullRatio: 0.5,
      };
      expect(EquipmentSetup_summary(setup)).to.equal("Weight stack · 10–200 by 10 · half · +5/10");
    });
  });
});
