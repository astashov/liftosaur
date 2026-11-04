import "mocha";
import { expect } from "chai";
import {
  ILiftographSeriesSpec,
  ILiftographWidget,
  LiftographCompile_document,
} from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { ILiftographEmission, ILiftographFoldResult } from "../src/liftograph/liftographFold";
import {
  LiftographShape_series,
  LiftographShape_subtract,
  LiftographShape_value,
  LiftographShape_valueAt,
  LiftographShape_window,
} from "../src/liftograph/liftographShape";
import { fxDay, fxSettings } from "./liftographFixtures";

const settings = fxSettings();

function widgetOf(text: string): ILiftographWidget {
  const compiled = LiftographCompile_document(LiftographDocument_parse(text), settings);
  expect(compiled.diagnostics).to.deep.equal([]);
  return compiled.layout[0].items[0];
}

function seriesOf(line: string): ILiftographSeriesSpec {
  const widget = widgetOf(`graph {\n  ${line}\n}`);
  if (widget.kind !== "graph" || widget.series[0].status !== "ready") {
    throw new Error(`expected a graph with a ready series, got ${widget.kind}`);
  }
  return widget.series[0].spec;
}

function foldOf(points: [Date, number, number?][]): ILiftographFoldResult {
  const emissions: ILiftographEmission[] = points.map(([date, y, x], i) => ({
    rowId: `${i}`,
    ts: date.getTime(),
    order: 0,
    x,
    y,
  }));
  return { emissions, checkpoint: { state: {}, yKind: "number" } };
}

describe("LiftographShape_subtract", () => {
  it("clamps the day at month ends and returns local midnight", () => {
    expect(new Date(LiftographShape_subtract(fxDay(2026, 3, 31, 15).getTime(), { n: 1, unit: "m" }))).to.deep.equal(
      new Date(2026, 1, 28)
    );
    expect(new Date(LiftographShape_subtract(fxDay(2024, 2, 29, 15).getTime(), { n: 1, unit: "y" }))).to.deep.equal(
      new Date(2023, 1, 28)
    );
    expect(new Date(LiftographShape_subtract(fxDay(2026, 3, 9, 23).getTime(), { n: 1, unit: "d" }))).to.deep.equal(
      new Date(2026, 2, 8)
    );
  });
});

describe("LiftographShape_window", () => {
  it("starts the day after the subtracted date and counts local days, today included", () => {
    const march31 = fxDay(2026, 3, 31, 15).getTime();
    const month = LiftographShape_window(march31, { n: 1, unit: "m" }, undefined);
    expect(new Date(month.from)).to.deep.equal(new Date(2026, 2, 1));
    expect(month.days).to.equal(31);
    expect(new Date(month.to)).to.deep.equal(new Date(2026, 3, 1, 0, 0, 0, -1));
    expect(LiftographShape_window(march31, { n: 7, unit: "d" }, undefined).days).to.equal(7);
    expect(LiftographShape_window(march31, { n: 2, unit: "w" }, undefined).days).to.equal(14);
    expect(LiftographShape_window(march31, { n: 1, unit: "y" }, undefined).days).to.equal(365);
  });

  it("starts 'all' at the first workout's day, or today with no history", () => {
    const march31 = fxDay(2026, 3, 31, 15).getTime();
    const all = LiftographShape_window(march31, "all", fxDay(2026, 3, 20, 18).getTime());
    expect(new Date(all.from)).to.deep.equal(new Date(2026, 2, 20));
    expect(all.days).to.equal(12);
    expect(LiftographShape_window(march31, "all", undefined).days).to.equal(1);
  });
});

describe("LiftographShape", () => {
  it("aggregates everything into one point with a group over all", () => {
    const spec = seriesOf("name: W / source: workout / group: sum(all)");
    const fold = foldOf([
      [fxDay(2026, 3, 2), 1],
      [fxDay(2026, 3, 9), 1],
    ]);
    expect(LiftographShape_valueAt(fold, spec, settings, fxDay(2026, 3, 20).getTime())).to.equal(2);
  });

  it("gives a gap for an empty current bucket instead of an older value", () => {
    const spec = seriesOf("name: W / source: workout / group: max(1w)");
    const fold = foldOf([[fxDay(2026, 3, 2), 1]]);
    expect(LiftographShape_valueAt(fold, spec, settings, fxDay(2026, 3, 4).getTime())).to.equal(1);
    expect(LiftographShape_valueAt(fold, spec, settings, fxDay(2026, 3, 20).getTime())).to.equal(undefined);
  });

  it("keeps a 7d range to 7 calendar days", () => {
    const spec = seriesOf("name: S / source: exercise(Squat)");
    const fold = foldOf([
      [fxDay(2026, 3, 13, 10), 1],
      [fxDay(2026, 3, 14, 10), 2],
    ]);
    const shaped = LiftographShape_series(fold, spec, settings, fxDay(2026, 3, 20).getTime(), { n: 7, unit: "d" });
    expect(shaped.points.map((p) => p.y)).to.deep.equal([2]);
  });

  it("labels counts as plain numbers even for a weight series", () => {
    const spec = seriesOf("name: S / source: exercise(Squat) / smooth: count(7d)");
    const fold: ILiftographFoldResult = {
      ...foldOf([[fxDay(2026, 3, 13), 100]]),
      checkpoint: { state: {}, yKind: "weight" },
    };
    expect(LiftographShape_series(fold, spec, settings, fxDay(2026, 3, 14).getTime()).y).to.deep.equal({
      kind: "number",
    });
  });

  it("groups by week and fills empty weeks with 0 for sum", () => {
    const spec = seriesOf("name: W / source: workout / group: sum(1w)");
    const fold = foldOf([
      [fxDay(2026, 3, 2), 1],
      [fxDay(2026, 3, 4), 1],
      [fxDay(2026, 3, 18), 1],
    ]);
    const shaped = LiftographShape_series(fold, spec, settings, fxDay(2026, 3, 20).getTime());
    expect(shaped.points.map((p) => [new Date(p.x).getDate(), p.y])).to.deep.equal([
      [1, 2],
      [8, 0],
      [15, 1],
    ]);
  });

  it("cuts points after the date before grouping", () => {
    const spec = seriesOf("name: M / source: workout / group: sum(1m)");
    const fold = foldOf([
      [fxDay(2026, 3, 5), 1],
      [fxDay(2026, 3, 15), 1],
    ]);
    expect(LiftographShape_valueAt(fold, spec, settings, fxDay(2026, 3, 13).getTime())).to.equal(1);
    expect(LiftographShape_valueAt(fold, spec, settings, fxDay(2026, 3, 20).getTime())).to.equal(2);
  });

  it("smooths over a number of points", () => {
    const spec = seriesOf("name: S / source: exercise(Squat) / smooth: avg(2)");
    const fold = foldOf([
      [fxDay(2026, 3, 1), 100],
      [fxDay(2026, 3, 3), 110],
      [fxDay(2026, 3, 5), 130],
    ]);
    expect(
      LiftographShape_series(fold, spec, settings, fxDay(2026, 3, 6).getTime()).points.map((p) => p.y)
    ).to.deep.equal([100, 105, 120]);
  });

  it("evaluates a trailing duration window at the date, as the reference trend example says", () => {
    const widget = widgetOf("value / name: Workouts / source: workout / smooth: sum(7d) / trend: 14d");
    if (widget.kind !== "value") {
      throw new Error("expected a value");
    }
    const today = fxDay(2026, 3, 20);
    const fold = foldOf([[fxDay(2026, 3, 10), 1]]);
    const result = LiftographShape_value(fold, widget, settings, today.getTime());
    expect(result.value).to.equal(0);
    expect(result.trend).to.deep.equal([0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]);
  });

  it("shows compare as the value now minus the value back then, hidden on a gap", () => {
    const widget = widgetOf("value / name: BW / source: stats(weight) / compare: 4w");
    if (widget.kind !== "value") {
      throw new Error("expected a value");
    }
    const fold = foldOf([
      [fxDay(2026, 2, 1), 180],
      [fxDay(2026, 3, 1), 185],
    ]);
    expect(LiftographShape_value(fold, widget, settings, fxDay(2026, 3, 2).getTime()).compare).to.equal(5);
    expect(LiftographShape_value(fold, widget, settings, fxDay(2026, 1, 20).getTime()).compare).to.equal(undefined);
  });

  it("groups numeric x by equal x and filters rows by range date", () => {
    const spec = seriesOf(
      "name: R / source: exercise(Squat) / group: max {~ for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) } ~}"
    );
    const fold = foldOf([
      [fxDay(2025, 1, 1), 300, 1],
      [fxDay(2026, 2, 1), 200, 5],
      [fxDay(2026, 3, 1), 220, 5],
      [fxDay(2026, 3, 1), 250, 1],
    ]);
    const shaped = LiftographShape_series(fold, spec, settings, fxDay(2026, 3, 10).getTime(), { n: 1, unit: "y" });
    expect(shaped.xMode).to.equal("number");
    expect(shaped.points).to.deep.equal([
      { x: 1, y: 250 },
      { x: 5, y: 220 },
    ]);
  });
});
