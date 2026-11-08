import "mocha";
import { expect } from "chai";
import {
  ILiftographModelSeries,
  ILiftographWidgetModel,
  LiftographWidgetModel_addSeries,
  LiftographWidgetModel_aggHint,
  LiftographWidgetModel_exerciseType,
  LiftographWidgetModel_isNumeric,
  LiftographWidgetModel_windows,
  LiftographWidgetModel_moveSeries,
  LiftographWidgetModel_newSeries,
  LiftographWidgetModel_presetsFor,
  LiftographWidgetModel_read,
  LiftographWidgetModel_pickerExercise,
  LiftographWidgetModel_removeSeries,
  LiftographWidgetModel_splitOptions,
  LiftographWidgetModel_seriesSummary,
  LiftographWidgetModel_setSeries,
  LiftographWidgetModel_setSource,
  LiftographWidgetModel_withAgg,
  LiftographWidgetModel_withExercise,
  LiftographWidgetModel_write,
} from "../src/liftograph/liftographWidgetModel";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographCompile_document } from "../src/liftograph/liftographCompile";
import { fxSettings } from "./liftographFixtures";

const LF = { eol: "\n", indent: "" };

function read(snippet: string): ILiftographWidgetModel {
  const model = LiftographWidgetModel_read(snippet);
  if (model == null) {
    throw new Error(`unreadable: ${snippet}`);
  }
  return model;
}

function roundTrip(snippet: string, format = LF): string {
  return LiftographWidgetModel_write(read(snippet), format);
}

function firstSeries(model: ILiftographWidgetModel): ILiftographModelSeries {
  if (model.kind === "value") {
    return model.series;
  }
  const entry = model.kind === "graph" ? model.entries.find((e) => e.type === "series") : undefined;
  if (entry?.type !== "series") {
    throw new Error("no series");
  }
  return entry.series;
}

describe("LiftographWidgetModel", () => {
  describe("read", () => {
    it("reads a graph with series", () => {
      const model = read("graph / range: 3m {\n  name: Squat / source: exercise(Squat, barbell) / y: e1rm\n}");
      expect(model).to.deep.equal({
        kind: "graph",
        range: "3m",
        extra: [],
        entries: [
          {
            type: "series",
            series: {
              name: "Squat",
              source: { type: "exercise", name: "Squat", equipment: "barbell" },
              values: { type: "preset", preset: "e1rm" },
              extra: [],
            },
          },
        ],
      });
    });

    it("returns undefined for text, unknown kinds, rows and syntax errors", () => {
      expect(LiftographWidgetModel_read("// Hello")).to.equal(undefined);
      expect(LiftographWidgetModel_read("chart / range: 3m")).to.equal(undefined);
      expect(LiftographWidgetModel_read("row {\n  calendar\n}")).to.equal(undefined);
      expect(LiftographWidgetModel_read("graph {\n  name: A / source: workout")).to.equal(undefined);
      expect(LiftographWidgetModel_read("value / source: workout {")).to.equal(undefined);
    });

    it("returns undefined when a series has both y: and a script", () => {
      expect(LiftographWidgetModel_read("value / source: workout / y: volume {~ point(1) ~}")).to.equal(undefined);
    });

    it("keeps the type of a day filter", () => {
      const byNumber = firstSeries(read("value / source: workout(day: 2)"));
      const byName = firstSeries(read('value / source: workout(day: "2")'));
      expect(byNumber.source).to.deep.equal({ type: "workout", day: { type: "number", value: 2 } });
      expect(byName.source).to.deep.equal({ type: "workout", day: { type: "name", value: "2" } });
    });

    it("keeps unknown sources and malformed aggregates as raw text", () => {
      const series = firstSeries(read("value / source: health(sleep) / group: max(1w, 2)"));
      expect(series.source).to.deep.equal({ type: "raw", text: "health(sleep)" });
      expect(series.group).to.deep.equal({ type: "raw", text: "max(1w, 2)" });
    });

    it("collapses duplicate keys to the last one", () => {
      const series = firstSeries(read("value / name: A / source: workout / name: B"));
      expect(series.name).to.equal("B");
    });

    it("moves an unreadable known key into extra", () => {
      const series = firstSeries(read("value / source: workout / mark: zigzag"));
      expect(series.mark).to.equal(undefined);
      expect(series.extra).to.deep.equal([{ key: "mark", text: "zigzag" }]);
    });

    it("reads muscles show", () => {
      const model = read("muscles / range: 4w / show: map, sets(chest, back)");
      expect(model).to.deep.equal({
        kind: "muscles",
        range: "4w",
        show: { type: "show", map: true, sets: true, groups: ["chest", "back"] },
        source: undefined,
        extra: [],
      });
    });
  });

  describe("write", () => {
    it("normalizes spacing and key order", () => {
      expect(roundTrip("value/source:workout/name:Volume/compare:4w")).to.equal(
        "value / name: Volume / source: workout / y: volume / compare: 4w"
      );
    });

    it("always writes y:", () => {
      expect(roundTrip("graph {\n  name: S / source: exercise(Squat)\n}")).to.equal(
        "graph {\n  name: S / source: exercise(Squat) / y: maxWeight\n}"
      );
    });

    it("keeps script bodies byte for byte", () => {
      const snippet = "graph {\n  name: S / source: exercise(Squat) {~\n    point(max(e1rm) / bodyweight)\n  ~}\n}";
      expect(roundTrip(snippet)).to.equal(snippet);
    });

    it("keeps /// and // lines inside a graph in place", () => {
      const snippet = [
        "graph / range: 1y {",
        "  /// name: Hidden / source: workout / y: volume",
        "  name: A / source: workout / y: volume",
        "  // note",
        "  name: B / source: exercise(Squat) / y: e1rm",
        "}",
      ].join("\n");
      expect(roundTrip(snippet)).to.equal(snippet);
    });

    it("keeps unknown keys and raw values", () => {
      expect(roundTrip("value / source: health(sleep) / flavor: spicy")).to.equal(
        "value / source: health(sleep) / flavor: spicy"
      );
    });

    it("quotes a day name that looks like a number", () => {
      expect(roundTrip('value / source: workout(day: "2")')).to.equal('value / source: workout(day: "2") / y: volume');
      expect(roundTrip("value / source: workout(day: 2)")).to.equal("value / source: workout(day: 2) / y: volume");
    });

    it("uses the given line ending and indent", () => {
      expect(roundTrip("graph {\n  name: A / source: workout / y: volume\n}", { eol: "\r\n", indent: "  " })).to.equal(
        "  graph {\r\n    name: A / source: workout / y: volume\r\n  }"
      );
    });

    it("reads a CRLF snippet", () => {
      expect(roundTrip("graph {\r\n  name: A / source: workout / y: volume\r\n}")).to.equal(
        "graph {\n  name: A / source: workout / y: volume\n}"
      );
    });

    it("joins \\ continuations", () => {
      expect(roundTrip("value / name: A \\\n  / source: workout")).to.equal(
        "value / name: A / source: workout / y: volume"
      );
    });

    it("writes muscles and calendar", () => {
      expect(roundTrip("muscles / show: sets(chest) / range: 4w")).to.equal("muscles / range: 4w / show: sets(chest)");
      expect(roundTrip("calendar / range: 6m")).to.equal("calendar / range: 6m");
    });

    it("writes text that compiles", () => {
      const snippets = [
        "graph / range: 3m {\n  name: Squat / source: exercise(Squat, barbell, label: Heavy) / group: max(1w) / smooth: avg(3)\n}",
        "value / name: Hard sets / source: workout / y: muscleSets(chest) / compare: 1w / trend: 4w",
        'muscles / range: 4w / show: map / source: workout(program: "My, Program")',
      ];
      for (const snippet of snippets) {
        const written = roundTrip(snippet);
        const compiled = LiftographCompile_document(LiftographDocument_parse(written), fxSettings());
        expect(compiled.diagnostics, written).to.deep.equal([]);
      }
    });
  });

  describe("updates", () => {
    it("setSource drops a preset the new source does not allow", () => {
      const series: ILiftographModelSeries = {
        source: { type: "exercise", name: "Squat" },
        values: { type: "preset", preset: "e1rm" },
        extra: [],
      };
      expect(LiftographWidgetModel_setSource(series, { type: "workout" }).values).to.equal(undefined);
      expect(LiftographWidgetModel_setSource(series, { type: "exercise", name: "Bench Press" }).values).to.deep.equal({
        type: "preset",
        preset: "e1rm",
      });
    });

    it("presetsFor lists presets per source", () => {
      expect(LiftographWidgetModel_presetsFor({ type: "stats", key: "weight" })).to.deep.equal(["value"]);
      expect(LiftographWidgetModel_presetsFor({ type: "workout" })).to.include("volume");
      expect(LiftographWidgetModel_presetsFor(undefined)).to.deep.equal([]);
    });

    it("isNumeric finds point(x, y)", () => {
      expect(
        LiftographWidgetModel_isNumeric({ values: { type: "script", text: " point(reps, weight) " }, extra: [] })
      ).to.equal(true);
      expect(
        LiftographWidgetModel_isNumeric({ values: { type: "script", text: " point(reps) " }, extra: [] })
      ).to.equal(false);
    });

    it("moveSeries skips /// lines and keeps each series' color", () => {
      const model = read(
        "graph {\n  name: A / source: workout / y: volume\n  /// hidden\n  name: B / source: workout / y: volume\n}"
      );
      const moved = LiftographWidgetModel_moveSeries(model, 1, 0);
      expect(LiftographWidgetModel_write(moved, LF)).to.equal(
        "graph {\n  name: B / source: workout / y: volume / color: blue\n  /// hidden\n  name: A / source: workout / y: volume / color: red\n}"
      );
    });

    it("keeps explicit colors and pins nothing when no position changes", () => {
      const model = read(
        "graph {\n  name: A / source: workout / color: red\n  name: B / source: workout\n  name: C / source: workout\n}"
      );
      const removed = LiftographWidgetModel_removeSeries(model, 2);
      expect(LiftographWidgetModel_write(removed, LF)).to.equal(
        "graph {\n  name: A / source: workout / y: volume / color: red\n  name: B / source: workout / y: volume\n}"
      );
      const swapped = LiftographWidgetModel_moveSeries(model, 0, 1);
      expect(LiftographWidgetModel_write(swapped, LF)).to.equal(
        "graph {\n  name: B / source: workout / y: volume / color: blue\n  name: A / source: workout / y: volume / color: red\n  name: C / source: workout / y: volume\n}"
      );
    });

    it("adds, sets and removes series", () => {
      const model = read("graph {\n  name: A / source: workout / y: volume\n}");
      const added = LiftographWidgetModel_addSeries(model, LiftographWidgetModel_newSeries());
      const renamed = LiftographWidgetModel_setSeries(added, 1, { ...LiftographWidgetModel_newSeries(), name: "C" });
      const removed = LiftographWidgetModel_removeSeries(renamed, 0);
      expect(LiftographWidgetModel_write(removed, LF)).to.equal(
        "graph {\n  name: C / source: exercise(Squat) / y: maxWeight / color: blue\n}"
      );
    });
  });
});

describe("LiftographWidgetModel helpers", () => {
  it("withExercise keeps filters and replaces equipment", () => {
    expect(
      LiftographWidgetModel_withExercise(
        { type: "exercise", name: "Squat", equipment: "barbell", label: "H" },
        "Bench Press",
        undefined
      )
    ).to.eql({ type: "exercise", name: "Bench Press", label: "H" });
    expect(LiftographWidgetModel_withExercise({ type: "workout" }, "Squat", "barbell")).to.eql({
      type: "exercise",
      name: "Squat",
      equipment: "barbell",
    });
  });

  it("withAgg keeps the window or uses the default", () => {
    expect(LiftographWidgetModel_withAgg(undefined, "max", "1w")).to.eql({ type: "agg", agg: "max", window: "1w" });
    expect(LiftographWidgetModel_withAgg({ type: "agg", agg: "sum", window: "4w" }, "max", "1w")).to.eql({
      type: "agg",
      agg: "max",
      window: "4w",
    });
    expect(LiftographWidgetModel_withAgg({ type: "agg", agg: "sum" }, undefined, "1w")).to.equal(undefined);
  });
});

describe("LiftographWidgetModel form helpers", () => {
  it("aggHint explains group and smooth in words", () => {
    expect(LiftographWidgetModel_aggHint("group", undefined)).to.equal("One point per workout.");
    expect(LiftographWidgetModel_aggHint("group", { type: "agg", agg: "max", window: "1w" })).to.equal(
      "One point per week: the max of that period."
    );
    expect(LiftographWidgetModel_aggHint("group", { type: "agg", agg: "sum", window: "2w" })).to.equal(
      "One point per 2 weeks: the sum of that period."
    );
    expect(LiftographWidgetModel_aggHint("smooth", { type: "agg", agg: "avg", window: "5" })).to.equal(
      "Each point becomes the average of the last 5 points."
    );
    expect(LiftographWidgetModel_aggHint("smooth", { type: "agg", agg: "avg", window: "30d" })).to.equal(
      "Each point becomes the average of the last 30 days."
    );
  });

  it("windows keep a custom window as an extra option", () => {
    expect(LiftographWidgetModel_windows("group", "1w")).to.eql(["1w", "2w", "1m", "3m"]);
    expect(LiftographWidgetModel_windows("group", "6w")).to.eql(["1w", "2w", "1m", "3m", "6w"]);
  });

  it("exerciseType resolves the written name and equipment", () => {
    const settings = fxSettings();
    expect(
      LiftographWidgetModel_exerciseType({ type: "exercise", name: "Squat", equipment: "Barbell" }, settings.exercises)
    ).to.eql({ id: "squat", equipment: "barbell" });
    expect(LiftographWidgetModel_exerciseType({ type: "exercise", name: "Nope" }, settings.exercises)).to.equal(
      undefined
    );
    expect(LiftographWidgetModel_exerciseType({ type: "workout" }, settings.exercises)).to.equal(undefined);
  });
});

describe("LiftographWidgetModel_seriesSummary", () => {
  it("joins source, what to plot and grouping", () => {
    expect(
      LiftographWidgetModel_seriesSummary({
        source: { type: "exercise", name: "Deadlift", equipment: "Barbell" },
        group: { type: "agg", agg: "max", window: "1w" },
        extra: [],
      })
    ).to.equal("Deadlift, Barbell · Max weight · max per week");
    expect(
      LiftographWidgetModel_seriesSummary({
        source: { type: "workout" },
        values: { type: "script", text: "x" },
        extra: [],
      })
    ).to.equal("All workouts · Custom script");
  });
});

describe("LiftographWidgetModel option helpers", () => {
  it("splitOptions shows the first ones and keeps the current value visible", () => {
    const options = ["a", "b", "c", "d"];
    expect(LiftographWidgetModel_splitOptions(options, undefined, 2)).to.eql({ visible: ["a", "b"], rest: ["c", "d"] });
    expect(LiftographWidgetModel_splitOptions(options, "d", 2)).to.eql({ visible: ["a", "b", "d"], rest: ["c"] });
    expect(LiftographWidgetModel_splitOptions(options, "zz", 2)).to.eql({
      visible: ["a", "b", "zz"],
      rest: ["c", "d"],
    });
  });

  it("pickerExercise uses the series exercise or falls back to squat", () => {
    const settings = fxSettings();
    const model = read("graph {\n  name: A / source: exercise(Bench Press, Dumbbell)\n  name: B / source: workout\n}");
    expect(LiftographWidgetModel_pickerExercise(model, 0, settings.exercises)).to.eql({
      id: "benchPress",
      equipment: "dumbbell",
    });
    expect(LiftographWidgetModel_pickerExercise(model, 1, settings.exercises)).to.eql({
      id: "squat",
      equipment: "barbell",
    });
  });
});
