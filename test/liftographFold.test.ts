import "mocha";
import { expect } from "chai";
import { ILiftographSeriesSpec, LiftographCompile_document } from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographFold_context, LiftographFold_run, LiftographFold_step } from "../src/liftograph/liftographFold";
import { LiftographRows_build } from "../src/liftograph/liftographRows";
import { IHistoryRecord, IStats } from "../src/types";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();

function series(line: string): ILiftographSeriesSpec {
  const compiled = LiftographCompile_document(LiftographDocument_parse(`graph {\n  ${line}\n}`), settings);
  expect(compiled.diagnostics).to.deep.equal([]);
  const widget = compiled.layout[0].items[0];
  if (widget.kind !== "graph" || widget.series[0].status !== "ready") {
    throw new Error(`expected a graph with a ready series, got ${widget.kind}`);
  }
  return widget.series[0].spec;
}

function fold(
  line: string,
  history: IHistoryRecord[],
  stats: IStats = fxStats()
): ReturnType<typeof LiftographFold_run> {
  const spec = series(line);
  const rows = LiftographRows_build(spec.source, history, stats, settings);
  return LiftographFold_run(spec, rows, LiftographFold_context(settings, stats));
}

describe("LiftographFold_run", () => {
  const history = [
    fxRecord(fxDay(2026, 2, 1), [
      fxEntry("benchPress", [fxSet(100, 5)], {
        state: { rm1: { value: 120, unit: "lb" } },
        vars: { rm1: { value: 125, unit: "lb" } },
      }),
    ]),
    fxRecord(fxDay(2026, 2, 3), [fxEntry("benchPress", [fxSet(110, 5)])]),
    fxRecord(fxDay(2026, 2, 5), [
      fxEntry("benchPress", [fxSet(120, 5)], { state: { rm1: { value: 130, unit: "lb" } } }),
    ]),
  ];

  it("keeps state from one row to the next", () => {
    const result = fold(
      "name: Bench / source: exercise(Bench Press) {~\n  if (state.first == 0) { state.first = max(e1rm) }\n  point(max(e1rm) / state.first * 100)\n~}",
      history
    );
    expect(result.error).to.equal(undefined);
    expect(result.checkpoint.yKind).to.equal("number");
    expect(result.checkpoint.state).to.have.property("first");
    expect(result.emissions.map((e) => Math.round(e.y))).to.deep.equal([100, 110, 120]);
  });

  it("reads saved program state and rm1, and leaves gaps where they are missing", () => {
    expect(
      fold('name: S / source: exercise(Bench Press) {~ point(programState("rm1")) ~}', history).emissions.map(
        (e) => e.y
      )
    ).to.deep.equal([120, 130]);
    expect(
      fold("name: R / source: exercise(Bench Press) {~ point(rm1) ~}", history).emissions.map((e) => e.y)
    ).to.deep.equal([125]);
  });

  it("reads the newest bodyweight at or before each workout", () => {
    const stats = fxStats([[fxDay(2026, 2, 2), 200]]);
    const result = fold(
      "name: Rel / source: exercise(Bench Press) {~ point(max(completedWeights) / bodyweight) ~}",
      history,
      stats
    );
    expect(result.emissions.map((e) => e.y)).to.deep.equal([0.55, 0.6]);
  });

  it("adds one point per point() call and keeps their order", () => {
    const result = fold(
      "name: Reps / source: exercise(Bench Press) / group: max {~\n  for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) }\n~}",
      [fxRecord(fxDay(2026, 2, 1), [fxEntry("benchPress", [fxSet(100, 5), fxSet(120, 1)])])]
    );
    expect(result.checkpoint.xKind).to.equal("number");
    expect(result.emissions.map((e) => [e.order, e.x, e.y])).to.deep.equal([
      [0, 5, 100],
      [1, 1, 120],
    ]);
  });

  it("matches sets to exercises in a workout row", () => {
    const workout = fxRecord(fxDay(2026, 2, 1), [
      fxEntry("squat", [fxSet(200, 5), fxSet(200, 5)], { programExerciseId: "t1-squat_barbell" }),
      fxEntry("benchPress", [fxSet(100, 5)]),
    ]);
    const share = fold(
      'name: Share / source: workout {~\n  var.squat = 0\n  for (var.i in completedReps) {\n    if (isSetExercise(var.i, "Squat")) { var.squat += completedReps[var.i] * completedWeights[var.i] }\n  }\n  point(var.squat / volume)\n~}',
      [workout]
    );
    expect(share.emissions.map((e) => Math.round(e.y * 100))).to.deep.equal([80]);
    const t1 = fold(
      'name: T1 / source: workout {~\n  var.n = 0\n  for (var.i in completedReps) {\n    if (isSetProgramExercise(var.i, "t1: Squat")) { var.n += 1 }\n  }\n  point(var.n)\n~}',
      [workout]
    );
    expect(t1.emissions.map((e) => e.y)).to.deep.equal([2]);
  });

  it("stops the series at a runtime error and names the row", () => {
    const result = fold('name: X / source: workout {~ point(isSetExercise(9, "Squat") ? 1 : 0) ~}', history);
    expect(result.emissions).to.deep.equal([]);
    expect(result.error?.message).to.contain("Set 9 is out of range");
    expect(result.error?.rowId).to.equal(`${history[0].id}`);
  });

  it("stops a series that mixes weights and plain numbers", () => {
    const result = fold(
      "name: X / source: exercise(Bench Press) {~ if (max(completedWeights) > 105lb) { point(1) } else { point(volume) } ~}",
      history
    );
    expect(result.error?.message).to.equal("This series mixes weights and plain numbers");
  });

  it("resumes from a saved checkpoint with the same result as a full run", () => {
    const line =
      "name: Bench / source: exercise(Bench Press) {~\n  if (state.first == 0) { state.first = max(e1rm) }\n  point(max(e1rm) / state.first * 100)\n~}";
    const spec = series(line);
    const context = LiftographFold_context(settings, fxStats());
    const rows = LiftographRows_build(spec.source, history, fxStats(), settings);
    const head = LiftographFold_run(spec, rows.slice(0, 2), context);
    const saved = JSON.parse(JSON.stringify(head.checkpoint));
    const tail = LiftographFold_step(spec, rows[2], saved, context);
    const full = LiftographFold_run(spec, rows, context);
    expect([...head.emissions, ...tail.emissions]).to.deep.equal(full.emissions);
    expect(tail.checkpoint).to.deep.equal(full.checkpoint);
  });
});
