import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import {
  Equipment_previewBodyweight,
  Equipment_getEquipmentDataForExerciseType,
  Equipment_setupIn,
  Equipment_legacyChanged,
} from "../src/models/equipment";
import { EquipmentLoadSolver_select } from "../src/models/equipmentLoadSolver";
import {
  EquipmentSetup_convertUnit,
  EquipmentSetup_save,
  EquipmentSetup_summary,
  EquipmentSetup_toLegacy,
  EquipmentSetup_validate,
} from "../src/models/equipmentSetup";
import { IEquipmentData, IEquipmentSetup, IExerciseType, ISettings, IUnit, IWeight } from "../src/types";
import { LegacyPlates_calculate } from "./legacyPlates";
import { Weight_calculatePlates } from "../src/models/weight";
import { EquipmentLegacyDefaults_all } from "../src/models/equipmentLegacyDefaults";

function w(value: number, unit: IUnit): IWeight {
  return { value, unit };
}

const targets = [0, 2.5, 5, 12.5, 20, 45, 47.5, 61, 100, 135, 137.5, 186, 225, 300, 405, 1000, -20, -47.5];

function newTotal(settings: ISettings, target: IWeight, exerciseType: IExerciseType): IWeight {
  const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
  const setup = Equipment_setupIn(data, target.unit);
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

function legacySettings(): ISettings {
  const settings = Settings_build();
  settings.gyms[0].equipment = EquipmentLegacyDefaults_all();
  return settings;
}

function settingsWith(equipment: string, change: Partial<IEquipmentData>, bodyweight?: IWeight): ISettings {
  const settings = legacySettings();
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
          expectParity(legacySettings(), equipment, unit);
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

    it("lists plates heaviest first, from old data and on save", () => {
      const settings = settingsWith("barbell", {
        plates: [
          { weight: w(10, "lb"), num: 4 },
          { weight: w(45, "lb"), num: 8 },
          { weight: w(2.5, "lb"), num: 4 },
        ],
      });
      const data = settings.gyms[0].equipment.barbell!;
      const setup = Equipment_setupIn(data, "lb");
      expect(setup.type === "plates" ? setup.plates.map((p) => p.weight) : []).to.eql([45, 10, 2.5]);
      const stack: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        ranges: [{ from: 10, to: 200, step: 10 }],
        addOn: [
          { weight: 1.25, num: 1 },
          { weight: 5, num: 1 },
        ],
      };
      const saved = EquipmentSetup_save(data, stack).setup;
      expect(saved?.type === "stack" ? saved.addOn?.map((p) => p.weight) : []).to.eql([5, 1.25]);
    });

    it("keeps bodyweight turned on through an edit when none is logged", () => {
      const settings = settingsWith("barbell", { useBodyweightForBar: true });
      const data = settings.gyms[0].equipment.barbell!;
      const setup = Equipment_setupIn(data, "lb");
      if (setup.type !== "plates") {
        throw new Error("expected a plates setup");
      }
      expect(setup.base).to.equal(0);
      expect(setup.bodyweight).to.eql({});
      const edited = EquipmentSetup_save(data, { ...setup, sides: 1 });
      expect(edited.useBodyweightForBar).to.equal(true);
      const load = EquipmentLoadSolver_select(setup, w(225, "lb"), {
        bodyweight: Equipment_previewBodyweight(settings),
      });
      expect(load.total.value).to.be.within(220, 225);
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
      ["two linked stacks", { type: "stack", unit: "lb", ranges: [{ from: 10, to: 150, step: 10 }], stackCount: 2 }],
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
      expect(Equipment_setupIn(data, "lb")).to.eql(stack);
      expect(Equipment_setupIn({ ...data, name: "Renamed", notes: "Seat 4" }, "lb")).to.eql(stack);
    });

    it("uses the saved setup after a round trip reorders object keys", () => {
      const { settings, exerciseType } = settingsWithSetup(stack);
      const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
      const reordered = {
        ...data,
        bar: { kg: { unit: data.bar.kg.unit, value: data.bar.kg.value }, lb: { unit: "lb", value: data.bar.lb.value } },
        plates: data.plates.map((p) => ({ num: p.num, weight: { unit: p.weight.unit, value: p.weight.value } })),
      } as const;
      expect(Equipment_legacyChanged(reordered)).to.equal(false);
      expect(Equipment_setupIn(reordered, "lb")).to.eql(stack);
    });

    it("uses the old fields once something else changed them", () => {
      const { settings, exerciseType } = settingsWithSetup(stack);
      const data = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
      const edited = { ...data, plates: [{ weight: w(25, "lb"), num: 2 }] };
      expect(Equipment_setupIn(edited, "lb").type).to.equal("plates");
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

    it("keeps a fine step above 0 after converting", () => {
      const electric: IEquipmentSetup = { type: "electric", unit: "lb", min: 1, max: 100, step: 0.1 };
      const converted = EquipmentSetup_convertUnit(electric, "kg", "convert");
      expect(converted.type === "electric" ? converted.step : 0).to.equal(0.05);
      expect(EquipmentSetup_validate(converted)).to.eql([]);
    });

    it("only changes the unit when relabeling", () => {
      expect(EquipmentSetup_convertUnit(barbell, "kg", "relabel")).to.eql({ ...barbell, unit: "kg" });
    });
  });

  describe("validation", () => {
    it("rejects two bands with the same name", () => {
      const bands: IEquipmentSetup = {
        type: "bands",
        unit: "lb",
        bands: [
          { name: "Red", weight: 25, num: 1 },
          { name: "Red", weight: 40, num: 1 },
        ],
        combine: true,
      };
      expect(EquipmentSetup_validate(bands)).to.eql(["Two bands are named Red."]);
    });

    it("accepts a normal stack and rejects broken ranges", () => {
      const stack: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
      expect(EquipmentSetup_validate(stack)).to.eql([]);
      expect(EquipmentSetup_validate({ ...stack, ranges: [{ from: 10, to: 200, step: 0 }] })).to.eql([
        "A step must be above 0.",
      ]);
      expect(EquipmentSetup_validate({ ...stack, ranges: [{ from: 200, to: 10, step: 10 }] })).to.eql([
        "A range can't start above its end (200 → 10).",
      ]);
      expect(EquipmentSetup_validate({ ...stack, ranges: [] })).to.eql(["Add at least one range to the stack."]);
      expect(EquipmentSetup_validate({ ...stack, pullRatio: 0 })).to.eql(["The pull ratio must be above 0."]);
    });

    it("rejects fractional counts, zero sides and horns without a ratio", () => {
      const plates: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 45,
        plates: [{ weight: 45, num: 2.5 }],
        sides: 0,
        horns: [{ name: "Top", ratio: 0 }],
      };
      expect(EquipmentSetup_validate(plates)).to.eql([
        "Sides must be a whole number, 1 or more.",
        "Plate counts must be whole numbers.",
        "At least one horn needs a ratio above 0.",
      ]);
    });

    it("caps add-on combinations at the solver's limit", () => {
      const stack: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        ranges: [{ from: 10, to: 200, step: 10 }],
        addOn: [
          { weight: 0.5, num: 8 },
          { weight: 5, num: 4 },
        ],
      };
      expect(EquipmentSetup_validate(stack)).to.eql([]);
      const pairsOnHorns = {
        ...stack,
        addOn: [45, 35, 25, 10, 5, 2.5, 1, 0.75, 0.5, 0.25].map((weight) => ({ weight, num: 2 })),
      };
      expect(EquipmentSetup_validate(pairsOnHorns)).to.eql([]);
      const huge = {
        ...stack,
        addOn: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024].map((weight) => ({ weight, num: 1 })),
      };
      expect(EquipmentSetup_validate(huge)).to.eql([
        "Too many added plates to combine. Remove some sizes or lower their counts.",
      ]);
    });

    it("checks the bodyweight share", () => {
      const fixed: IEquipmentSetup = {
        type: "fixed",
        unit: "lb",
        ranges: [],
        values: [20],
        bodyweight: { share: 1.5 },
      };
      expect(EquipmentSetup_validate(fixed)).to.eql(["The share of bodyweight must be above 0% and at most 100%."]);
    });
  });

  describe("bodyweight", () => {
    it("starts a workout load from the bar when no bodyweight is logged", () => {
      const settings = settingsWith("leverageMachine", { useBodyweightForBar: true });
      const exerciseType: IExerciseType = { id: "squat", equipment: "leverageMachine" };
      expect(Weight_calculatePlates(w(50, "kg"), settings, "kg", exerciseType).totalWeight).to.eql(w(50, "kg"));
    });

    it("previews with the logged bodyweight, or 80 kg when none is logged", () => {
      const settings = Settings_build();
      expect(Equipment_previewBodyweight(settings)).to.eql(w(80, "kg"));
      settings.currentBodyweight = w(176, "lb");
      expect(Equipment_previewBodyweight(settings)).to.eql(w(176, "lb"));
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
      expect(EquipmentSetup_summary({ ...setup, stackCount: 2, showPinNumbers: true })).to.equal(
        "Weight stack · 10–200 by 10 · half · 2 stacks · pin numbers · +5/10"
      );
    });

    it("allows 1 to 4 linked stacks", () => {
      const stack: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
      expect(EquipmentSetup_validate({ ...stack, stackCount: 2 })).to.eql([]);
      expect(EquipmentSetup_validate({ ...stack, stackCount: 5 })).to.eql([
        "The number of stacks must be a whole number from 1 to 4.",
      ]);
      expect(EquipmentSetup_validate({ ...stack, stackCount: 1.5 })).to.have.lengthOf(1);
    });

    it("lists fixed weights without a plus when there are no ranges", () => {
      const setup: IEquipmentSetup = { type: "fixed", unit: "lb", ranges: [], values: [10, 15] };
      expect(EquipmentSetup_summary(setup)).to.equal("Fixed weights · 10, 15");
      const withRange: IEquipmentSetup = { ...setup, ranges: [{ from: 20, to: 50, step: 5 }] };
      expect(EquipmentSetup_summary(withRange)).to.equal("Fixed weights · 20–50 by 5 · +10, 15");
    });
  });
});
