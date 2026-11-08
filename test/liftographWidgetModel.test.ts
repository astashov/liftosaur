import "mocha";
import { expect } from "chai";
import {
  ILiftographModelSeries,
  ILiftographWidgetModel,
  LiftographWidgetModel_read,
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
});

describe("LiftographWidgetModel review fixes", () => {
  it("refuses a snippet with a caption or /// lines outside the widget", () => {
    expect(LiftographWidgetModel_read("// My caption\ncalendar")).to.equal(undefined);
    expect(LiftographWidgetModel_read("calendar\n/// note")).to.equal(undefined);
    expect(LiftographWidgetModel_read("graph {\n  /// hidden\n  name: A / source: workout\n}")).to.not.equal(undefined);
  });

  it("a form value replaces an unreadable value with the same key", () => {
    const series = firstSeries(read("value / source: workout / mark: zigzag"));
    const model: ILiftographWidgetModel = { kind: "value", series: { ...series, mark: "bars" } };
    expect(LiftographWidgetModel_write(model, LF)).to.equal("value / source: workout / y: volume / mark: bars");
  });

  it("keeps quoted spacing and empty strings on write", () => {
    expect(roundTrip('value / source: workout(program: "My  Plan")')).to.equal(
      'value / source: workout(program: "My  Plan") / y: volume'
    );
    expect(roundTrip('value / source: exercise(Squat, label: "")')).to.equal(
      'value / source: exercise(Squat, label: "") / y: maxWeight'
    );
  });
});
