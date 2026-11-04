import "mocha";
import { expect } from "chai";
import { ILiftographWidget } from "../src/liftograph/liftographCompile";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import {
  ILiftographMusclesResult,
  LiftographMuscles_evaluate,
  LiftographMuscles_layout,
  LiftographMuscles_sections,
  LiftographMuscles_summary,
} from "../src/liftograph/liftographMuscles";
import { WeekInsightsUtils_calculateSetResults } from "../src/utils/weekInsightsUtils";
import { IHistoryRecord, ISettings } from "../src/types";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

type IMusclesWidget = Extract<ILiftographWidget, { kind: "muscles" }>;

const TODAY = fxDay(2026, 3, 18).getTime();

function bench(date: Date, sets: number, programName: string = "Program"): IHistoryRecord {
  const done = Array.from({ length: sets }, () => fxSet(135, 5));
  return fxRecord(date, [fxEntry("benchPress", done)], { programName });
}

function evaluate(
  text: string,
  history: IHistoryRecord[],
  settings: ISettings = fxSettings()
): { widget: IMusclesWidget; result: ILiftographMusclesResult } {
  const evaluation = LiftographSeriesEval_create({ history, stats: fxStats(), settings, today: TODAY });
  const widget = LiftographSeriesEval_compile(evaluation, text).layout[0].items[0];
  if (widget.kind !== "muscles") {
    throw new Error(`expected a muscles widget, got ${widget.kind}`);
  }
  return { widget, result: LiftographMuscles_evaluate(widget, evaluation) };
}

function chest(result: ILiftographMusclesResult): number {
  const split = result.muscleGroup.chest;
  return (split?.strength ?? 0) + (split?.hypertrophy ?? 0);
}

describe("LiftographMuscles", () => {
  const history = [bench(fxDay(2026, 3, 10), 5), bench(fxDay(2026, 3, 17), 5)];

  it("averages week insights sets per week over the window's local days", () => {
    expect(chest(evaluate("muscles / range: 7d", history).result)).to.equal(5);
    expect(chest(evaluate("muscles / range: 2w", history).result)).to.equal(5);
    expect(chest(evaluate("muscles / range: 4w", history).result)).to.equal(2.5);
    expect(evaluate("muscles / range: 4w", history).result.window.days).to.equal(28);
  });

  it("matches week insights exactly over a 7-day window", () => {
    const { result } = evaluate("muscles / range: 7d", history);
    expect(result.muscleGroup).to.deep.equal(
      WeekInsightsUtils_calculateSetResults([history[1]], fxSettings()).muscleGroup
    );
  });

  it("drops records dated after today", () => {
    const future = [...history, bench(fxDay(2026, 3, 20), 10)];
    expect(chest(evaluate("muscles / range: 7d", future).result)).to.equal(5);
  });

  it("filters by the workout source, and takes the 'all' start from the whole history", () => {
    const mixed = [bench(fxDay(2026, 2, 19), 5, "Old"), bench(fxDay(2026, 3, 17), 4, "New")];
    const { result } = evaluate("muscles / range: all / source: workout(program: New)", mixed);
    expect(result.window.days).to.equal(28);
    expect(chest(result)).to.equal(1);
  });

  it("puts the map beside the list from 300 points, and shows the summary only under a lone or side map", () => {
    const both = evaluate("muscles", history).widget;
    expect(LiftographMuscles_layout(both, 299)).to.deep.equal({
      showMap: true,
      showList: true,
      isSideBySide: false,
      showSummary: false,
    });
    expect(LiftographMuscles_layout(both, 300)).to.deep.include({ isSideBySide: true, showSummary: true });
    const mapOnly = evaluate("muscles / show: map", history).widget;
    expect(LiftographMuscles_layout(mapOnly, 200)).to.deep.include({ showList: false, showSummary: true });
  });

  it("summarizes groups in range and the lowest one", () => {
    const settings = fxSettings();
    const ranged: ISettings = {
      ...settings,
      planner: { ...settings.planner, weeklyRangeSets: { chest: [4, 6], triceps: [10, 12], biceps: [0, 0] } },
    };
    const { widget, result } = evaluate("muscles / range: 7d", history, ranged);
    const triceps = (result.muscleGroup.triceps?.strength ?? 0) + (result.muscleGroup.triceps?.hypertrophy ?? 0);
    expect(LiftographMuscles_summary(widget, result, ranged)).to.deep.equal({
      title: "2 of 3 in range",
      detail: `Lowest: Triceps ${Math.round(triceps)} · 10–12`,
    });
    const picked = evaluate("muscles / show: map, sets(chest, biceps)", history, ranged);
    expect(LiftographMuscles_summary(picked.widget, picked.result, ranged)?.title).to.equal("2 of 2 in range");
    const none: ISettings = { ...settings, planner: { ...settings.planner, weeklyRangeSets: {} } };
    const unranged = evaluate("muscles", history, none);
    expect(LiftographMuscles_summary(unranged.widget, unranged.result, none)).to.equal(undefined);
  });

  it("lists only the picked groups, in the written order, with zero for untrained ones", () => {
    const { widget, result } = evaluate("muscles / show: sets(neck, chest)", history);
    const sections = LiftographMuscles_sections(widget, result, fxSettings());
    expect(sections.map((rows) => rows.map((row) => row.muscleGroup))).to.deep.equal([["neck", "chest"]]);
    expect(sections[0][0].split.strength).to.equal(0);
    expect(LiftographMuscles_layout(widget, 400)).to.deep.include({ showMap: false, showList: true });
  });

  it("rejects unknown groups and an empty sets()", () => {
    const evaluation = LiftographSeriesEval_create({ history, stats: fxStats(), settings: fxSettings(), today: TODAY });
    const messages = (text: string): string[] =>
      LiftographSeriesEval_compile(evaluation, text).diagnostics.map((d) => d.message);
    expect(messages("muscles / show: map, sets(chest, wings)")).to.deep.equal(["Unknown muscle group 'wings'"]);
    expect(messages("muscles / show: sets()")).to.deep.equal([
      "sets(...) needs at least one muscle group, like sets(chest)",
    ]);
    expect(messages("muscles / show: map(chest)")).to.deep.equal(["Only sets(...) takes muscle groups"]);
    expect(messages("muscles / show: map, sets(chest)")).to.deep.equal([]);
  });
});
