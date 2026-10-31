import "mocha";
import { expect } from "chai";
import { ILiftographSeriesSpec, LiftographCompile_document } from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographFold_context, LiftographFold_run } from "../src/liftograph/liftographFold";
import { LiftographRows_build } from "../src/liftograph/liftographRows";
import { LiftographSeriesEval_create, LiftographSeriesEval_fold } from "../src/liftograph/liftographSeriesEval";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();
const history = [
  fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(200, 5)]), fxEntry("benchPress", [fxSet(135, 5)])]),
  fxRecord(fxDay(2026, 3, 4), [fxEntry("squat", [fxSet(210, 5), fxSet(230, 1)])]),
];
const input = { history, stats: fxStats(), settings, today: fxDay(2026, 3, 18).getTime() };

function seriesOf(text: string): ILiftographSeriesSpec[] {
  const widget = LiftographCompile_document(LiftographDocument_parse(text), settings).layout[0].items[0];
  if (widget.kind !== "graph") {
    throw new Error("expected a graph");
  }
  return widget.series.map((s) => {
    if (s.status !== "ready") {
      throw new Error(s.message);
    }
    return s.spec;
  });
}

describe("LiftographSeriesEval", () => {
  it("folds shared rows to the same result as separate builds", () => {
    const series = seriesOf(
      "graph {\n  name: A / source: exercise(Squat) / y: maxWeight\n  name: B / source: exercise(Squat) / y: e1rm\n  name: C / source: workout / y: muscleSets(chest)\n}"
    );
    const evaluation = LiftographSeriesEval_create(input);
    for (const spec of series) {
      const rows = LiftographRows_build(spec.source, history, input.stats, settings);
      const separate = LiftographFold_run(spec, rows, LiftographFold_context(settings, input.stats));
      expect(LiftographSeriesEval_fold(evaluation, spec)).to.deep.equal(separate);
    }
    expect(evaluation.rowsBySource.size).to.equal(2);
  });

  it("computes the muscle totals of a workout once for all series", () => {
    const series = seriesOf(
      'graph {\n  name: A / source: workout / y: muscleSets(chest)\n  name: B / source: workout / y: muscleVolume(chest)\n  name: C / source: workout {~ point(muscleSets("chest")) ~}\n}'
    );
    const evaluation = LiftographSeriesEval_create(input);
    const first = evaluation.context.muscleGroups(history[0]);
    for (const spec of series) {
      LiftographSeriesEval_fold(evaluation, spec);
    }
    expect(evaluation.context.muscleGroups(history[0])).to.equal(first);
  });
});
