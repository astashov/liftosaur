import "mocha";
import { expect } from "chai";
import { LiftographCompile_document, ILiftographSeriesSpec } from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographFold_context, LiftographFold_run } from "../src/liftograph/liftographFold";
import { LiftographRows_build } from "../src/liftograph/liftographRows";
import { History_collectMuscleGroups, History_getMax1RMSet, History_getMaxWeightSet } from "../src/models/history";
import { Weight_convertTo, Weight_getOneRepMax } from "../src/models/weight";
import { Collector } from "../src/utils/collector";
import { IHistoryRecord, ISet } from "../src/types";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();

function unilateral(weight: number, right: number, left: number): ISet {
  return { ...fxSet(weight, right), isUnilateral: true, completedRepsLeft: left };
}

const history: IHistoryRecord[] = [
  fxRecord(fxDay(2026, 1, 5), [fxEntry("squat", [fxSet(100, 5), fxSet(110, 3, { completedRpe: 8 }), fxSet(120, 0)])]),
  fxRecord(fxDay(2026, 1, 7), [
    fxEntry("squat", [fxSet(undefined, 5, { plannedWeight: 105 }), fxSet(50, 5, { unit: "kg" })]),
  ]),
  fxRecord(fxDay(2026, 1, 9), [fxEntry("squat", [fxSet(100, undefined), fxSet(100, 0)])]),
  fxRecord(fxDay(2026, 1, 11), [fxEntry("squat", [])]),
  fxRecord(fxDay(2026, 1, 13), [fxEntry("squat", [unilateral(60, 8, 6), fxSet(95, 5, { rpe: 9 })])]),
  fxRecord(
    fxDay(2026, 1, 15),
    [fxEntry("benchPress", [fxSet(135, 5), fxSet(135, 5), fxSet(135, 0)]), fxEntry("squat", [fxSet(185, 3)])],
    { durationMin: 75 }
  ),
];

function seriesOf(text: string): ILiftographSeriesSpec[] {
  const compiled = LiftographCompile_document(LiftographDocument_parse(text), settings);
  expect(compiled.diagnostics).to.deep.equal([]);
  const widget = compiled.layout[0].items[0];
  if (widget.kind !== "graph") {
    throw new Error(`expected a graph, got ${widget.kind}`);
  }
  return widget.series.map((s) => {
    if (s.status !== "ready") {
      throw new Error(s.message);
    }
    return s.spec;
  });
}

function emissions(spec: ILiftographSeriesSpec): { rowId: string; y: number }[] {
  const rows = LiftographRows_build(spec.source, history, fxStats(), settings);
  const fold = LiftographFold_run(spec, rows, LiftographFold_context(settings, fxStats()));
  expect(fold.error).to.equal(undefined);
  return fold.emissions.map((e) => ({ rowId: e.rowId, y: e.y }));
}

describe("Liftograph presets", () => {
  const cases: [string, string, string][] = [
    ["maxWeight", "exercise(Squat)", "point(max(completedWeights))"],
    ["e1rm", "exercise(Squat)", "point(max(e1rm))"],
    ["volume", "exercise(Squat)", "point(volume)"],
    ["maxReps", "exercise(Squat)", "point(max(completedReps))"],
    ["volume", "workout", "point(volume)"],
    ["muscleSets(chest)", "workout", 'point(muscleSets("chest"))'],
    ["muscleVolume(triceps)", "workout", 'point(muscleVolume("triceps"))'],
    ["duration", "workout", "point(duration)"],
  ];
  for (const [preset, source, script] of cases) {
    it(`gives the same points for '${preset}' as its script '${script}'`, () => {
      const [fast, slow] = seriesOf(
        `graph {\n  name: A / source: ${source} / y: ${preset}\n  name: B / source: ${source} {~ ${script} ~}\n}`
      );
      expect(fast.values.type).to.equal("preset");
      expect(slow.values.type).to.equal("script");
      expect(emissions(fast)).to.deep.equal(emissions(slow));
    });
  }

  it("matches the current graph helpers for max weight and e1RM", () => {
    const [maxWeight, e1rm] = seriesOf(
      "graph {\n  name: A / source: exercise(Squat) / y: maxWeight\n  name: B / source: exercise(Squat) / y: e1rm\n}"
    );
    const squatEntries = history.flatMap((r) => r.entries.filter((e) => e.exercise.id === "squat"));
    const expectedMax = squatEntries.flatMap((entry) => {
      const set = History_getMaxWeightSet(entry.sets);
      return set != null ? [Weight_convertTo(set.completedWeight ?? set.weight!, "lb").value] : [];
    });
    const expectedE1rm = squatEntries.flatMap((entry) => {
      const set = History_getMax1RMSet(entry.sets);
      if (set == null) {
        return [];
      }
      const weight = Weight_convertTo(set.completedWeight ?? set.weight!, "lb");
      return [Weight_getOneRepMax(weight, set.completedReps || 0, set.completedRpe ?? set.rpe ?? 10).value];
    });
    expect(emissions(maxWeight).map((e) => e.y)).to.deep.equal(expectedMax);
    expect(emissions(e1rm).map((e) => e.y)).to.deep.equal(expectedE1rm);
  });

  it("averages unilateral reps for e1RM, as the current graph picks the set", () => {
    const record = fxRecord(fxDay(2026, 2, 1), [fxEntry("squat", [unilateral(100, 10, 2), unilateral(100, 8, 8)])]);
    const [e1rm] = seriesOf("graph {\n  name: B / source: exercise(Squat) / y: e1rm\n}");
    const rows = LiftographRows_build(e1rm.source, [record], fxStats(), settings);
    const fold = LiftographFold_run(e1rm, rows, LiftographFold_context(settings, fxStats()));
    const best = History_getMax1RMSet(record.entries[0].sets);
    expect(best?.completedRepsLeft).to.equal(8);
    expect(fold.emissions.map((e) => e.y)).to.deep.equal([
      Weight_getOneRepMax({ value: 100, unit: "lb" }, 8, 10).value,
    ]);
  });

  it("keeps the weekly muscle-group numbers of the current graph", () => {
    const [result] = Collector.build(history).addFn(History_collectMuscleGroups(settings)).run();
    const chest = result.chest;
    expect(chest[2].reduce((a, b) => a + b, 0)).to.equal(2);
    expect(result.triceps[2].reduce((a, b) => a + b, 0)).to.equal(1);
    expect(chest[1].reduce((a, b) => a + b, 0)).to.equal(1350);
  });
});
