import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import {
  Program_evaluate,
  Program_getProgramExerciseForKeyAndDay,
  Program_nextHistoryRecord,
} from "../src/models/program";
import { Stats_getEmpty } from "../src/models/stats";
import { Weight_build } from "../src/models/weight";
import { IWeightDeviation, WeightDeviation_hint } from "../src/models/weightDeviation";
import { IHistoryRecord, ISettings, IWeight } from "../src/types";
import { ObjectUtils_clone } from "../src/utils/object";

const lb = (value: number): IWeight => Weight_build(value, "lb");

class Workout {
  public progress: IHistoryRecord;
  public settings: ISettings;
  private readonly text: string;

  constructor(text: string, settings: ISettings = Settings_build()) {
    this.text = text;
    this.settings = settings;
    const { program } = PlannerTestUtils_get(text);
    this.progress = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
  }

  public complete(setIndex: number, weight: IWeight, entryIndex: number = 0): Workout {
    const set = this.progress.entries[entryIndex].sets[setIndex];
    set.isCompleted = true;
    set.completedReps = set.reps;
    set.completedWeight = weight;
    return this;
  }

  public hint(entryIndex: number = 0): IWeightDeviation | undefined {
    const { program } = PlannerTestUtils_get(this.text);
    const evaluated = Program_evaluate(program, this.settings);
    const entry = this.progress.entries[entryIndex];
    const programExercise = Program_getProgramExerciseForKeyAndDay(
      evaluated,
      this.progress.day,
      entry.programExerciseId!
    );
    return WeightDeviation_hint(entry, programExercise, this.settings);
  }
}

const day = (line: string): string => `# Week 1\n## Day 1\n${line}\n`;

describe("WeightDeviation_hint", () => {
  it("shows when the last completed set is lighter than the target", () => {
    const hint = new Workout(day("Squat / 3x5 / 200lb")).complete(0, lb(170)).hint();
    expect(hint).to.deep.include({ setIndex: 0, programSetIndex: 0, targetWeight: lb(200), completedWeight: lb(170) });
    expect(hint!.ratio).to.equal(0.85);
  });

  it("shows when the last completed set is heavier than the target", () => {
    const hint = new Workout(day("Squat / 3x5 / 45lb")).complete(0, lb(135)).hint();
    expect(hint?.ratio).to.equal(3);
  });

  it("hides when the completed weight matches the target", () => {
    expect(new Workout(day("Squat / 3x5 / 200lb")).complete(0, lb(200)).hint()).to.equal(undefined);
  });

  it("looks only at the last completed set", () => {
    const workout = new Workout(day("Squat / 3x5 / 200lb")).complete(0, lb(170)).complete(1, lb(200));
    expect(workout.hint()).to.equal(undefined);
    expect(workout.complete(2, lb(180)).hint()?.setIndex).to.equal(2);
  });

  it("divides by the program weight, not by the rounded target", () => {
    const hint = new Workout(day("Bench Press / 3x5 / 49lb")).complete(0, lb(90)).hint();
    expect(hint?.targetWeight).to.eql(lb(47.5));
    expect(hint?.ratio).to.equal(90 / 49);
  });

  it("hides for percentage targets", () => {
    expect(new Workout(day("Squat / 3x5 / 80%")).complete(0, lb(170)).hint()).to.equal(undefined);
  });

  it("hides for ask-weight sets", () => {
    expect(new Workout(day("Squat / 3x5 / 200lb+")).complete(0, lb(170)).hint()).to.equal(undefined);
  });

  it("hides for a zero target", () => {
    expect(new Workout(day("Squat / 3x5 / 0lb")).complete(0, lb(20)).hint()).to.equal(undefined);
  });

  it("hides when two sets point at the same program set", () => {
    const workout = new Workout(day("Squat / 1x5 / 200lb"));
    const sets = workout.progress.entries[0].sets;
    sets.push({ ...ObjectUtils_clone(sets[0]), id: "added", index: 1 });
    expect(workout.complete(1, lb(170)).hint()).to.equal(undefined);
  });

  it("shows when the progress script assigns weights", () => {
    const text = day(
      "Squat / 3x5 / 200lb / progress: custom() {~\n  weights = completedWeights[1] + 5lb\n  weights = 200lb\n~}"
    );
    expect(new Workout(text).complete(0, lb(170)).hint()).to.not.equal(undefined);
  });

  it("shows for the built-in lp progression", () => {
    const text = day("Squat / 3x5 / 200lb / progress: lp(5lb)");
    expect(new Workout(text).complete(0, lb(170)).hint()).to.not.equal(undefined);
  });

  it("hides when the update script assigns weights", () => {
    const text = day("Squat / 3x5 / 200lb / update: custom() {~\n  weights += 5lb\n~}");
    expect(new Workout(text).complete(0, lb(170)).hint()).to.equal(undefined);
  });

  it("hides when the update script calls sets()", () => {
    const text = day("Squat / 3x5 / 200lb / update: custom() {~\n  sets(1, 3, 5, 5, 0, 100lb, 60, 0, 0)\n~}");
    expect(new Workout(text).complete(0, lb(170)).hint()).to.equal(undefined);
  });

  it("shows when the update script only reads weights", () => {
    const text = day("Squat / 3x5 / 200lb / update: custom() {~\n  if (weights[1] > 100lb) { numberOfSets = 4 }\n~}");
    expect(new Workout(text).complete(0, lb(170)).hint()).to.not.equal(undefined);
  });

  it("computes the ratio in the program's unit when equipment is in lb", () => {
    const hint = new Workout(day("Squat / 3x5 / 100kg")).complete(0, lb(176.5)).hint();
    expect(hint?.ratio).to.be.closeTo(0.8, 0.001);
  });
});
