import "mocha";
import { expect } from "chai";
import {
  ILiftographModelSeries,
  ILiftographModelValues,
  ILiftographWidgetModel,
  LiftographWidgetModel_read,
  LiftographWidgetModel_write,
} from "../src/liftograph/liftographWidgetModel";
import {
  LiftographWidgetEdit_addSeries,
  LiftographWidgetEdit_chooseSource,
  LiftographWidgetEdit_moveSeries,
  LiftographWidgetEdit_newSeries,
  LiftographWidgetEdit_pickExercise,
  LiftographWidgetEdit_presetsFor,
  LiftographWidgetEdit_removeSeries,
  LiftographWidgetEdit_setSeries,
  LiftographWidgetEdit_setSource,
  LiftographWidgetEdit_withAgg,
  LiftographWidgetEdit_withPreset,
} from "../src/liftograph/liftographWidgetEdit";

const LF = { eol: "\n", indent: "" };

function read(snippet: string): ILiftographWidgetModel {
  const model = LiftographWidgetModel_read(snippet);
  if (model == null) {
    throw new Error(`unreadable: ${snippet}`);
  }
  return model;
}

function write(model: ILiftographWidgetModel): string {
  return LiftographWidgetModel_write(model, LF);
}

const squatE1rm: ILiftographModelSeries = {
  source: { type: "exercise", name: "Squat" },
  values: { type: "preset", preset: "e1rm" },
  extra: [],
};

describe("LiftographWidgetEdit", () => {
  it("setSource drops a preset the new source does not allow", () => {
    expect(LiftographWidgetEdit_setSource(squatE1rm, { type: "workout" }).values).to.equal(undefined);
    expect(LiftographWidgetEdit_setSource(squatE1rm, { type: "exercise", name: "Bench Press" }).values).to.eql({
      type: "preset",
      preset: "e1rm",
    });
  });

  it("presetsFor lists presets per source", () => {
    expect(LiftographWidgetEdit_presetsFor({ type: "stats", key: "weight" })).to.eql(["value"]);
    expect(LiftographWidgetEdit_presetsFor({ type: "workout" })).to.include("volume");
    expect(LiftographWidgetEdit_presetsFor(undefined)).to.eql([]);
  });

  it("chooseSource opens the picker for an exercise and sets the other kinds", () => {
    expect(LiftographWidgetEdit_chooseSource(squatE1rm, "exercise")).to.eql({ type: "none" });
    const workout: ILiftographModelSeries = { source: { type: "workout" }, extra: [] };
    expect(LiftographWidgetEdit_chooseSource(workout, "exercise")).to.eql({ type: "pickExercise" });
    expect(LiftographWidgetEdit_chooseSource(squatE1rm, "stats")).to.eql({
      type: "set",
      series: { source: { type: "stats", key: "weight" }, values: undefined, extra: [] },
    });
  });

  it("withPreset keeps the muscle group between the muscle presets only", () => {
    const sets: ILiftographModelValues = { type: "preset", preset: "muscleSets", arg: "chest" };
    expect(LiftographWidgetEdit_withPreset(sets, "muscleVolume")).to.eql({
      type: "preset",
      preset: "muscleVolume",
      arg: "chest",
    });
    expect(LiftographWidgetEdit_withPreset(sets, "volume")).to.eql({ type: "preset", preset: "volume" });
  });

  it("withPreset starts a muscle preset on all muscles", () => {
    expect(LiftographWidgetEdit_withPreset({ type: "preset", preset: "volume" }, "muscleSets")).to.eql({
      type: "preset",
      preset: "muscleSets",
      arg: "total",
    });
  });

  it("switching between exercise and workouts keeps program and day", () => {
    const filtered: ILiftographModelSeries = {
      source: { type: "exercise", name: "Squat", label: "T1", program: "GZCL", day: { type: "number", value: 2 } },
      extra: [],
    };
    const choice = LiftographWidgetEdit_chooseSource(filtered, "workout");
    expect(choice.type === "set" ? choice.series.source : undefined).to.eql({
      type: "workout",
      program: "GZCL",
      day: { type: "number", value: 2 },
    });
    const model = read("graph {\n  name: A / source: workout(program: GZCL, day: 2)\n}");
    expect(write(LiftographWidgetEdit_pickExercise(model, 0, "Squat", undefined))).to.equal(
      "graph {\n  name: A / source: exercise(Squat, program: GZCL, day: 2) / y: maxWeight\n}"
    );
  });

  it("withAgg keeps the window or uses the field default", () => {
    expect(LiftographWidgetEdit_withAgg(undefined, "max", "group")).to.eql({ type: "agg", agg: "max", window: "1w" });
    expect(LiftographWidgetEdit_withAgg(undefined, "avg", "smooth")).to.eql({ type: "agg", agg: "avg", window: "5" });
    expect(LiftographWidgetEdit_withAgg({ type: "agg", agg: "sum", window: "4w" }, "max", "group")).to.eql({
      type: "agg",
      agg: "max",
      window: "4w",
    });
    expect(LiftographWidgetEdit_withAgg({ type: "agg", agg: "sum" }, undefined, "group")).to.equal(undefined);
  });

  it("pickExercise keeps the filters and replaces the equipment", () => {
    const model = read('graph {\n  name: A / source: exercise(Squat, barbell, label: "H")\n}');
    expect(write(LiftographWidgetEdit_pickExercise(model, 0, "Bench Press", undefined))).to.equal(
      "graph {\n  name: A / source: exercise(Bench Press, label: H) / y: maxWeight\n}"
    );
  });

  it("moveSeries skips /// lines and keeps each series' color", () => {
    const model = read(
      "graph {\n  name: A / source: workout / y: volume\n  /// hidden\n  name: B / source: workout / y: volume\n}"
    );
    expect(write(LiftographWidgetEdit_moveSeries(model, 1, 0))).to.equal(
      "graph {\n  name: B / source: workout / y: volume / color: blue\n  /// hidden\n  name: A / source: workout / y: volume / color: red\n}"
    );
  });

  it("keeps explicit colors and pins nothing when no position changes", () => {
    const model = read(
      "graph {\n  name: A / source: workout / color: red\n  name: B / source: workout\n  name: C / source: workout\n}"
    );
    expect(write(LiftographWidgetEdit_removeSeries(model, 2))).to.equal(
      "graph {\n  name: A / source: workout / y: volume / color: red\n  name: B / source: workout / y: volume\n}"
    );
    expect(write(LiftographWidgetEdit_moveSeries(model, 0, 1))).to.equal(
      "graph {\n  name: B / source: workout / y: volume / color: blue\n  name: A / source: workout / y: volume / color: red\n  name: C / source: workout / y: volume\n}"
    );
  });

  it("adds, sets and removes series", () => {
    const model = read("graph {\n  name: A / source: workout / y: volume\n}");
    const added = LiftographWidgetEdit_addSeries(model, LiftographWidgetEdit_newSeries());
    const renamed = LiftographWidgetEdit_setSeries(added, 1, { ...LiftographWidgetEdit_newSeries(), name: "C" });
    expect(write(LiftographWidgetEdit_removeSeries(renamed, 0))).to.equal(
      "graph {\n  name: C / source: exercise(Squat) / y: maxWeight / color: blue\n}"
    );
  });
});
