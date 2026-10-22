import "mocha";
import { expect } from "chai";
import { EditEquipment_update } from "../src/models/editEquipment";
import {
  EquipmentSetupEdit_addPlates,
  EquipmentSetupEdit_addRange,
  EquipmentSetupEdit_addValue,
  EquipmentSetupEdit_apply,
  EquipmentSetupEdit_bodyweightHelp,
  EquipmentSetupEdit_bodyweightMode,
  EquipmentSetupEdit_bodyweightModesToAdd,
  EquipmentSetupEdit_pinNumbersExample,
  EquipmentSetupEdit_setHornName,
  EquipmentSetupEdit_bodyweightPercent,
  EquipmentSetupEdit_canAddHorn,
  EquipmentSetupEdit_hornPercents,
  EquipmentSetupEdit_changeType,
  EquipmentSetupEdit_default,
  EquipmentSetupEdit_defaultWarmupPlates,
  EquipmentSetupEdit_addBand,
  EquipmentSetupEdit_addHorn,
  EquipmentSetupEdit_bandColor,
  EquipmentSetupEdit_bandColorName,
  EquipmentSetupEdit_removeBand,
  EquipmentSetupEdit_updateBand,
  EquipmentSetupEdit_removeHorn,
  EquipmentSetupEdit_parseType,
  EquipmentSetupEdit_removeValue,
  EquipmentSetupEdit_setRounding,
  EquipmentSetupEdit_addWeight,
  EquipmentSetupEdit_typeName,
  EquipmentSetupEdit_unitChoice,
  EquipmentSetupEdit_newEquipment,
  EquipmentSetupEdit_removeRange,
  EquipmentSetupEdit_setBodyweight,
  EquipmentSetupEdit_setPlateCount,
  EquipmentSetupEdit_updateRange,
} from "../src/models/equipmentSetupEdit";
import { EquipmentSetup_convertUnit, EquipmentSetup_validate } from "../src/models/equipmentSetup";
import { Equipment_setupIn, Equipment_legacyChanged } from "../src/models/equipment";
import { Settings_build } from "../src/models/settings";
import { IEquipmentSetup, IStackSetup, IWeightRange } from "../src/types";

describe("EquipmentSetupEdit", () => {
  it("builds a valid default for every type in both units", () => {
    for (const type of ["stack", "plates", "fixed", "electric", "bands"] as const) {
      for (const unit of ["lb", "kg"] as const) {
        const setup = EquipmentSetupEdit_default(type, unit);
        expect(setup.type).to.equal(type);
        expect(setup.unit).to.equal(unit);
        expect(EquipmentSetup_validate(setup), `${type} ${unit}`).to.eql([]);
      }
    }
  });

  it("changes type to the new defaults and keeps rounding and bodyweight", () => {
    const stack: IEquipmentSetup = {
      ...EquipmentSetupEdit_default("stack", "kg"),
      rounding: "nearest",
      direction: "assists",
      bodyweight: {},
    };
    const plates = EquipmentSetupEdit_changeType(stack, "plates");
    expect(plates).to.eql({
      ...EquipmentSetupEdit_default("plates", "kg"),
      rounding: "nearest",
      direction: "assists",
      bodyweight: {},
    });
    expect(EquipmentSetupEdit_changeType(stack, "stack")).to.equal(stack);
  });

  describe("ranges", () => {
    const ranges: IWeightRange[] = [
      { from: 10, to: 200, step: 10 },
      { from: 200, to: 300, step: 20 },
    ];

    it("starts a new range where the last one ends", () => {
      expect(EquipmentSetupEdit_addRange(ranges)[2]).to.eql({ from: 300, to: 400, step: 20 });
      expect(EquipmentSetupEdit_addRange([])).to.eql([{ from: 5, to: 50, step: 5 }]);
    });

    it("moves the next row's start when a connected end changes", () => {
      expect(EquipmentSetupEdit_updateRange(ranges, 0, { to: 150 })).to.eql([
        { from: 10, to: 150, step: 10 },
        { from: 150, to: 300, step: 20 },
      ]);
      expect(EquipmentSetupEdit_updateRange(ranges, 1, { from: 180 })).to.eql([
        { from: 10, to: 180, step: 10 },
        { from: 180, to: 300, step: 20 },
      ]);
    });

    it("shifts the whole range up when the start passes the end", () => {
      expect(EquipmentSetupEdit_updateRange([{ from: 10, to: 200, step: 10 }], 0, { from: 300 })).to.eql([
        { from: 300, to: 490, step: 10 },
      ]);
      expect(EquipmentSetupEdit_updateRange(ranges, 0, { from: 250 })).to.eql([
        { from: 250, to: 440, step: 10 },
        { from: 440, to: 300, step: 20 },
      ]);
    });

    it("leaves separate ranges alone", () => {
      const separate: IWeightRange[] = [
        { from: 5, to: 25, step: 2.5 },
        { from: 30, to: 50, step: 5 },
      ];
      expect(EquipmentSetupEdit_updateRange(separate, 0, { to: 20 })[1]).to.eql({ from: 30, to: 50, step: 5 });
    });

    it("joins the neighbours when a connected middle row goes", () => {
      const three: IWeightRange[] = [
        { from: 15, to: 25, step: 5 },
        { from: 25, to: 55, step: 10 },
        { from: 55, to: 190, step: 15 },
      ];
      expect(EquipmentSetupEdit_removeRange(three, 1)).to.eql([
        { from: 15, to: 25, step: 5 },
        { from: 25, to: 190, step: 15 },
      ]);
      expect(EquipmentSetupEdit_removeRange(three, 2)).to.eql(three.slice(0, 2));
    });
  });

  it("sets, adds and removes plate counts", () => {
    const plates = [
      { weight: 45, num: 8 },
      { weight: 10, num: 4 },
    ];
    expect(EquipmentSetupEdit_setPlateCount(plates, 10, 6)).to.eql([
      { weight: 45, num: 8 },
      { weight: 10, num: 6 },
    ]);
    expect(EquipmentSetupEdit_setPlateCount(plates, 25, 4)).to.eql([
      { weight: 45, num: 8 },
      { weight: 25, num: 4 },
      { weight: 10, num: 4 },
    ]);
    expect(EquipmentSetupEdit_setPlateCount(plates, 45, 0)).to.eql([{ weight: 10, num: 4 }]);
    expect(EquipmentSetupEdit_addPlates(plates, 45)).to.eql([
      { weight: 45, num: 10 },
      { weight: 10, num: 4 },
    ]);
    expect(EquipmentSetupEdit_addPlates(plates, 5)).to.eql([...plates, { weight: 5, num: 2 }]);
    expect(EquipmentSetupEdit_addPlates(plates, undefined)).to.equal(plates);
    expect(EquipmentSetupEdit_addPlates(plates, 0)).to.equal(plates);
  });

  it("adds and removes single weights, sorted and without duplicates", () => {
    expect(EquipmentSetupEdit_addValue([10, 20], 15)).to.eql([10, 15, 20]);
    const values = [10, 20];
    expect(EquipmentSetupEdit_addValue(values, 20)).to.equal(values);
    expect(EquipmentSetupEdit_addValue(values, 0)).to.equal(values);
    expect(EquipmentSetupEdit_addValue(values, undefined)).to.equal(values);
    expect(EquipmentSetupEdit_removeValue(values, 10)).to.eql([20]);
  });

  it("maps editor choices to setup changes", () => {
    const stack: IStackSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
    expect(EquipmentSetupEdit_setRounding(stack, "nearest").rounding).to.equal("nearest");
    expect(EquipmentSetupEdit_setRounding(stack, "down").rounding).to.equal("down");
    expect(EquipmentSetupEdit_setRounding({ ...stack, rounding: "nearest" }, undefined)).to.eql(stack);
    expect(EquipmentSetupEdit_addWeight(stack, "builtin", 5)).to.eql({ ...stack, builtin: [5] });
    expect(EquipmentSetupEdit_addWeight(stack, "addOn", 2.5)).to.eql({ ...stack, addOn: [{ weight: 2.5, num: 2 }] });
    expect(EquipmentSetupEdit_addWeight(stack, "plates", 45)).to.equal(stack);
    const fixed = EquipmentSetupEdit_default("fixed", "kg");
    expect(EquipmentSetupEdit_addWeight(fixed, "values", 12)).to.eql({ ...fixed, values: [12] });
    expect([0, 1, 2, undefined].map(EquipmentSetupEdit_unitChoice)).to.eql([
      "convert",
      "relabel",
      undefined,
      undefined,
    ]);
    expect(EquipmentSetupEdit_parseType("plates")).to.equal("plates");
    expect(EquipmentSetupEdit_parseType("bands")).to.equal("bands");
    expect(EquipmentSetupEdit_parseType("chains")).to.equal(undefined);
    expect(EquipmentSetupEdit_typeName("fixed")).to.equal("Fixed weights");
  });

  it("explains what a program weight means with bodyweight", () => {
    const plates = EquipmentSetupEdit_default("plates", "lb");
    const bodyweight = { value: 180, unit: "lb" as const };
    const adds = EquipmentSetupEdit_setBodyweight(plates, "adds", true);
    expect(EquipmentSetupEdit_bodyweightHelp(adds, bodyweight, true)).to.equal(
      "Your bodyweight is 180 lb. 225 lb in a program means 45 lb added."
    );
    expect(EquipmentSetupEdit_bodyweightHelp({ ...adds, bodyweight: { share: 0.64 } }, bodyweight, false)).to.equal(
      "No bodyweight logged, so it uses 180 lb. 64% of it counts. 160.2 lb in a program means 45 lb added."
    );
    const assistedTotal = EquipmentSetupEdit_setBodyweight(plates, "assists", true);
    expect(EquipmentSetupEdit_bodyweightHelp(assistedTotal, bodyweight, true)).to.equal(
      "Your bodyweight is 180 lb. 135 lb in a program means 45 lb of assistance."
    );
    const assistedLoad = EquipmentSetupEdit_setBodyweight(plates, "assists", false);
    expect(EquipmentSetupEdit_bodyweightHelp(assistedLoad, bodyweight, true)).to.equal(
      "-45 lb in a program means 45 lb of assistance."
    );
    const kg = EquipmentSetupEdit_setBodyweight(EquipmentSetupEdit_default("plates", "kg"), "adds", true);
    expect(EquipmentSetupEdit_bodyweightHelp(kg, bodyweight, true)).to.equal(
      "Your bodyweight is 81.5 kg. 101.5 kg in a program means 20 kg added."
    );
  });

  it("explains pin numbers with the first three pins", () => {
    const stack: IStackSetup = {
      type: "stack",
      unit: "lb",
      ranges: [
        { from: 11, to: 22, step: 11 },
        { from: 22, to: 132, step: 11 },
      ],
    };
    expect(EquipmentSetupEdit_pinNumbersExample(stack)).to.equal(
      "Counted from the lightest plate: #1 is 11 lb, #2 is 22 lb, #3 is 33 lb."
    );
  });

  it("renames a horn unless the name is empty or taken", () => {
    const horns = [
      { name: "Top", ratio: 3 },
      { name: "Bottom", ratio: 1 },
    ];
    expect(EquipmentSetupEdit_setHornName(horns, 0, "  Upper ")).to.eql([
      { name: "Upper", ratio: 3 },
      { name: "Bottom", ratio: 1 },
    ]);
    expect(EquipmentSetupEdit_setHornName(horns, 0, "   ")).to.equal(horns);
    expect(EquipmentSetupEdit_setHornName(horns, 0, "bottom")).to.equal(horns);
  });

  it("reads the bodyweight mode and percent back from a setup", () => {
    const stack = EquipmentSetupEdit_default("stack", "kg");
    expect(EquipmentSetupEdit_bodyweightMode(stack)).to.equal(undefined);
    expect(EquipmentSetupEdit_bodyweightMode(EquipmentSetupEdit_setBodyweight(stack, "adds", true))).to.equal("adds");
    expect(EquipmentSetupEdit_bodyweightMode(EquipmentSetupEdit_setBodyweight(stack, "assists", false))).to.equal(
      "assists"
    );
    expect(EquipmentSetupEdit_bodyweightPercent({ ...stack, bodyweight: {} })).to.equal(100);
    expect(EquipmentSetupEdit_bodyweightPercent({ ...stack, bodyweight: { share: 0.655 } })).to.equal(66);
  });

  it("offers bodyweight modes only while none is set", () => {
    const plates = EquipmentSetupEdit_default("plates", "kg");
    expect(EquipmentSetupEdit_bodyweightModesToAdd(plates, ["adds", "assists"])).to.eql(["adds", "assists"]);
    const assisted = EquipmentSetupEdit_setBodyweight(plates, "assists", false);
    expect(EquipmentSetupEdit_bodyweightModesToAdd(assisted, ["adds", "assists"])).to.eql([]);
  });

  it("picks the two heaviest plates for warmups and marks the matching horn preset", () => {
    const plates = [
      { weight: 10, num: 4 },
      { weight: 45, num: 8 },
      { weight: 25, num: 4 },
    ];
    expect(EquipmentSetupEdit_defaultWarmupPlates(plates)).to.eql([45, 25]);
  });

  it("refuses to save an invalid setup and reports why", () => {
    const settings = Settings_build();
    const gym = settings.gyms[0];
    let dispatches = 0;
    const dispatch = (): void => {
      dispatches += 1;
    };
    const broken: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 0 }] };
    expect(EditEquipment_update(dispatch, gym.id, "cable", broken, "lb")).to.eql(["A step must be above 0."]);
    expect(dispatches).to.equal(0);
    expect(EditEquipment_update(dispatch, gym.id, "cable", EquipmentSetupEdit_default("stack", "lb"), "lb")).to.eql([]);
    expect(dispatches).to.equal(1);
  });

  it("turns horn ratios into percents of the plates", () => {
    const horns = [
      { name: "Top", ratio: 2 },
      { name: "Middle", ratio: 1 },
      { name: "Low", ratio: 1 },
    ];
    expect(EquipmentSetupEdit_hornPercents(horns)).to.eql([50, 25, 25]);
    expect(EquipmentSetupEdit_hornPercents([{ name: "Top", ratio: 0 }])).to.eql([0]);
  });

  it("adds, edits and removes bands", () => {
    const setup = EquipmentSetupEdit_default("bands", "lb");
    const bands = setup.type === "bands" ? setup.bands : [];
    expect(bands.map((b) => [b.name, b.color, b.weight])).to.eql([
      ["Yellow", "yellow", 10],
      ["Red", "red", 25],
      ["Blue", "blue", 40],
      ["Green", "green", 60],
      ["Black", "black", 80],
    ]);
    const added = EquipmentSetupEdit_addBand(bands, "lb");
    expect(added[5]).to.eql({ name: "Band 6", color: "purple", weight: 90, num: 1 });
    expect(EquipmentSetupEdit_addBand([], "kg")).to.eql([{ name: "Band 1", color: "yellow", weight: 5, num: 1 }]);
    expect(EquipmentSetupEdit_updateBand(added, 5, { name: "  Purple ", num: 2 })[5]).to.eql({
      name: "Purple",
      color: "purple",
      weight: 90,
      num: 2,
    });
    expect(EquipmentSetupEdit_updateBand(added, 5, { name: " " })).to.equal(added);
    expect(EquipmentSetupEdit_updateBand(added, 5, { weight: 0 })).to.equal(added);
    expect(EquipmentSetupEdit_updateBand(added, 5, { num: 1.5 })).to.equal(added);
    expect(EquipmentSetupEdit_removeBand(added, 0).map((b) => b.name)).to.eql([
      "Red",
      "Blue",
      "Green",
      "Black",
      "Band 6",
    ]);
    expect(EquipmentSetupEdit_bandColor({ color: "teal" })).to.equal("gray");
    expect(EquipmentSetupEdit_bandColorName("orange")).to.equal("Orange");
  });

  it("allows up to three horns", () => {
    const horns = [
      { name: "Top", ratio: 1 },
      { name: "Middle", ratio: 1 },
    ];
    expect(EquipmentSetupEdit_canAddHorn(horns)).to.equal(true);
    expect(EquipmentSetupEdit_canAddHorn([...horns, { name: "Low", ratio: 1 }])).to.equal(false);
  });

  it("starts with two horns and names new ones by the first free name", () => {
    const two = EquipmentSetupEdit_addHorn([]);
    expect(two).to.eql([
      { name: "Top", ratio: 1 },
      { name: "Middle", ratio: 1 },
    ]);
    expect(
      EquipmentSetupEdit_addHorn([
        { name: "Top", ratio: 3 },
        { name: "Low", ratio: 1 },
      ])
    ).to.eql([
      { name: "Top", ratio: 3 },
      { name: "Low", ratio: 1 },
      { name: "Middle", ratio: 1 },
    ]);
  });

  it("drops the horns when fewer than two would stay", () => {
    const three = [
      { name: "Top", ratio: 2 },
      { name: "Middle", ratio: 1 },
      { name: "Low", ratio: 1 },
    ];
    expect(EquipmentSetupEdit_removeHorn(three, 1)).to.eql([three[0], three[2]]);
    expect(EquipmentSetupEdit_removeHorn([three[0], three[1]], 0)).to.equal(undefined);
  });

  it("maps the bodyweight modes onto direction and bodyweight", () => {
    const base = EquipmentSetupEdit_default("plates", "lb");
    const share = { ...base, bodyweight: { share: 0.12 } };
    expect(EquipmentSetupEdit_setBodyweight(share, "adds", true)).to.eql(share);
    expect(EquipmentSetupEdit_setBodyweight(share, "adds", false)).to.eql(base);
    expect(EquipmentSetupEdit_setBodyweight(base, "assists", true)).to.eql({
      ...base,
      direction: "assists",
      bodyweight: {},
    });
    expect(EquipmentSetupEdit_setBodyweight(base, "assists", false)).to.eql({ ...base, direction: "assists" });
    expect(EquipmentSetupEdit_setBodyweight({ ...base, direction: "assists", bodyweight: {} }, "none", true)).to.eql(
      base
    );
  });

  it("writes setup and old fields together and keeps what the editor does not own", () => {
    const setup: IStackSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
    const created = EquipmentSetupEdit_newEquipment(setup, "Lat pulldown", "lb");
    expect(created.name).to.equal("Lat pulldown");
    expect(Equipment_setupIn(created, "lb")).to.eql(setup);
    const edited = EquipmentSetupEdit_apply(
      { ...created, notes: "Seat 4", isDeleted: false },
      { ...setup, pullRatio: 0.5 },
      "lb"
    );
    expect(edited.notes).to.equal("Seat 4");
    expect(edited.isDeleted).to.equal(false);
    expect(Equipment_legacyChanged(edited)).to.equal(false);
    expect(Equipment_legacyChanged({ ...edited, plates: [] })).to.equal(true);
  });

  it("pins the unit only when the setup differs from the app unit", () => {
    const setup: IStackSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };
    expect(EquipmentSetupEdit_newEquipment(setup, "Lat pulldown", "lb").unit).to.equal(undefined);
    const pinned = EquipmentSetupEdit_newEquipment(setup, "Lat pulldown", "kg");
    expect(pinned.unit).to.equal("lb");
    expect(Equipment_legacyChanged(pinned)).to.equal(false);
    const unpinned = EquipmentSetupEdit_apply(pinned, EquipmentSetup_convertUnit(setup, "kg", "convert"), "kg");
    expect(unpinned.unit).to.equal(undefined);
    expect(Equipment_legacyChanged(unpinned)).to.equal(false);
  });
});
