import "mocha";
import { expect } from "chai";
import {
  IEditorToken,
  LiftoEditorBrain_computeStyledRanges,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_flattenRanges,
  LiftoEditorBrain_stepToken,
  LiftoEditorBrain_tokens,
} from "../src/components/primitives/liftoEditorBrain";
import { LiftoEditorTestUtils_contextAt, LiftoEditorTestUtils_pos } from "./utils/liftoEditorTestUtils";

function breadcrumbAt(text: string, needle: string, occurrence: number = 0): string[] {
  return LiftoEditorTestUtils_contextAt(text, needle, occurrence).breadcrumb;
}

function tokenAt(text: string, needle: string, occurrence: number = 0): IEditorToken | undefined {
  const index = LiftoEditorTestUtils_pos(text, needle, occurrence);
  return LiftoEditorBrain_tokens(text).find((t) => index >= t.start && index <= t.end && t.text === needle);
}

describe("LiftoEditorBrain", () => {
  describe("contextAt", () => {
    it("builds the breadcrumb from exercise to leaf", () => {
      expect(breadcrumbAt("Squat / 3x8 100kg", "100kg")).to.deep.equal(["Squat", "Sets", "Set group", "Weight"]);
      expect(breadcrumbAt("Squat / 3x8 80%", "80%")).to.deep.equal(["Squat", "Sets", "Set group", "Percentage"]);
      expect(breadcrumbAt("Squat / 3x8 @8", "@8")).to.deep.equal(["Squat", "Sets", "Set group", "RPE"]);
      expect(breadcrumbAt("Squat / 3x8 60s", "60s")).to.deep.equal(["Squat", "Sets", "Set group", "Rest timer"]);
      expect(breadcrumbAt("Squat / 3x8 30s|60s", "30s|60s")).to.deep.equal(["Squat", "Sets", "Set group", "Set timer"]);
    });

    it("labels the exercise level with the exercise name", () => {
      expect(breadcrumbAt("Bench Press, Barbell / 3x8", "3x8")[0]).to.equal("Bench Press, Barbell");
    });

    it("numbers set groups only when there are several", () => {
      expect(breadcrumbAt("Squat / 3x8, 5x5", "5x5")).to.include("Set group 2");
      expect(breadcrumbAt("Squat / 3x8", "3x8")).to.include("Set group");
    });

    it("labels a globals section Globals", () => {
      expect(breadcrumbAt("Squat / 3x8 / 100lb 60s", "100lb")).to.include("Globals");
    });

    it("numbers the sets level only when the exercise has several set variations", () => {
      expect(breadcrumbAt("Squat / 3x8 / 5x5", "5x5")).to.include("Sets 2");
      expect(breadcrumbAt("Squat / 3x8 / 5x5", "3x8")).to.include("Sets 1");
      expect(breadcrumbAt("Squat / 3x8", "3x8")).to.include("Sets");
      // The globals section is not a variation, and doesn't affect numbering.
      expect(breadcrumbAt("Squat / 3x8 / 100lb 60s", "3x8")).to.include("Sets");
    });

    it("creates a variation level only for multi-variation exercises", () => {
      expect(breadcrumbAt("Squat | Front Squat / 3x8", "Front Squat")).to.deep.equal(["Squat", "Variation 2"]);
      expect(breadcrumbAt("Squat | Front Squat / 3x8", "Squat")).to.deep.equal(["Squat", "Variation 1"]);
      expect(breadcrumbAt("Squat / 3x8", "Squat")).to.deep.equal(["Squat"]);
    });

    it("synthesizes a Label level only when the tap lands inside the label prefix", () => {
      expect(breadcrumbAt("aux: Squat / 3x8", "aux")).to.include("Label");
      expect(breadcrumbAt("aux: Squat / 3x8", "Squat")).to.not.include("Label");
    });

    it("labels properties and functions", () => {
      expect(breadcrumbAt("Squat / 3x8 / progress: lp(5lb)", "lp")).to.deep.equal(["Squat", "Progress", "lp()"]);
      expect(breadcrumbAt("Squat / 3x8 / warmup: 2x5 45%", "45%")).to.deep.equal([
        "Squat",
        "Warmup",
        "Warmup sets",
        "Percentage",
      ]);
      expect(breadcrumbAt("Squat / 3x8 / warmup: 2x5 45%", "2x5")).to.include("Sets×Reps");
    });

    it("labels state variables with their keyword", () => {
      expect(breadcrumbAt("Squat / 3x8 / progress: custom(rating: 1) {~ ~}", "rating")).to.include("rating");
    });

    it("labels reuse, repeat and week/day", () => {
      expect(breadcrumbAt("Squat / ...Bench Press[2:1]", "...Bench")).to.include("Reuse");
      expect(breadcrumbAt("Squat / ...Bench Press[2:1]", "[2:1]")).to.include("Week/Day");
      expect(breadcrumbAt("Squat[1-3] / 3x8", "[1-3]")).to.include("Repeat");
    });

    it("labels week and day lines", () => {
      const text = "# Week 1\n## Day 1\nSquat / 3x8";
      expect(breadcrumbAt(text, "# Week 1")).to.deep.equal(["Week"]);
      expect(breadcrumbAt(text, "## Day 1")).to.deep.equal(["Day"]);
    });

    it("returns no levels outside any node", () => {
      expect(LiftoEditorBrain_contextAt("", 0).levels).to.deep.equal([]);
    });

    it("keeps week/day level extents on their line", () => {
      const text = "# Week 1\nSquat / 3x8";
      const context = LiftoEditorTestUtils_contextAt(text, "# Week 1");
      expect(text.slice(context.levels[0].start, context.levels[0].end)).to.equal("# Week 1");
    });

    it("excludes the trailing newline from the exercise level extent", () => {
      const text = "Squat / 3x8\nBench Press / 5x5";
      const level = LiftoEditorTestUtils_contextAt(text, "3x8").levels[0];
      expect(text.slice(level.start, level.end)).to.equal("Squat / 3x8");
    });
  });

  describe("tokens", () => {
    it("marks whole weights, percentages and timers as steppable stops", () => {
      const text = "Squat / 3x8 100kg 60s / 5x5 80%";
      expect(tokenAt(text, "100kg")?.numeric?.kind).to.equal("weight");
      expect(tokenAt(text, "80%")?.numeric?.kind).to.equal("percentage");
      expect(tokenAt(text, "60s")?.numeric?.kind).to.equal("timer");
      expect(tokenAt(text, "100kg")?.walkStop).to.equal(true);
    });

    it("marks bare ints as number tokens", () => {
      const token = tokenAt("Squat / 3x8", "8");
      expect(token?.numeric?.kind).to.equal("number");
    });

    it("keeps the exercise name as a single non-numeric stop", () => {
      const token = tokenAt("Bench Press, Barbell / 3x8", "Bench Press, Barbell");
      expect(token?.walkStop).to.equal(true);
      expect(token?.numeric).to.equal(undefined);
    });

    it("splits a labeled name into label and name stops", () => {
      const text = "aux: Bench Press / 3x8";
      expect(tokenAt(text, "aux")?.walkStop).to.equal(true);
      expect(tokenAt(text, "Bench Press")?.walkStop).to.equal(true);
      expect(tokenAt(text, "aux: Bench Press")).to.equal(undefined);
    });

    it("flags function argument numerics as inFunctionArgs", () => {
      const text = "Squat / 3x8 100lb / progress: lp(5lb)";
      expect(tokenAt(text, "5lb")?.numeric?.inFunctionArgs).to.equal(true);
      expect(tokenAt(text, "100lb")?.numeric?.inFunctionArgs).to.equal(false);
    });

    it("extracts steppable numerics from liftoscript bodies as function-arg values", () => {
      const text = "Squat / 3x8 / update: custom() {~ weights += 2.5kg ~}";
      const token = tokenAt(text, "2.5kg");
      expect(token?.numeric?.kind).to.equal("weight");
      expect(token?.numeric?.inFunctionArgs).to.equal(true);
    });

    it("exposes state var names as stops and their values as numerics", () => {
      const text = "Squat / 3x8 / progress: custom(rating: 5) {~ ~}";
      expect(tokenAt(text, "rating")?.walkStop).to.equal(true);
      const value = tokenAt(text, "5");
      expect(value?.numeric?.kind).to.equal("number");
    });
  });

  describe("stepToken", () => {
    function step(text: string, direction: 1 | -1): string | undefined {
      const token: IEditorToken = {
        start: 0,
        end: text.length,
        text,
        walkStop: true,
        numeric: {
          kind: text.endsWith("%")
            ? "percentage"
            : text.endsWith("s")
              ? "timer"
              : /[a-z]/.test(text)
                ? "weight"
                : "number",
          inFunctionArgs: true,
        },
      };
      return LiftoEditorBrain_stepToken(token, direction);
    }

    it("steps weights and percentages by one, timers by fifteen", () => {
      expect(step("100kg", 1)).to.equal("101kg");
      expect(step("45%", 1)).to.equal("46%");
      expect(step("60s", 1)).to.equal("75s");
      expect(step("60s", -1)).to.equal("45s");
      expect(step("8", 1)).to.equal("9");
    });

    it("keeps decimals and signs", () => {
      expect(step("2.5kg", 1)).to.equal("3.5kg");
      expect(step("-5lb", 1)).to.equal("-4lb");
      expect(step("0.5", -1)).to.equal("-0.5");
    });

    it("returns undefined for non-numeric tokens", () => {
      expect(LiftoEditorBrain_stepToken({ start: 0, end: 5, text: "Squat", walkStop: true }, 1)).to.equal(undefined);
    });
  });

  describe("styled ranges", () => {
    it("styles known node kinds", () => {
      const text = "Squat / 3x8 100kg 60s";
      const ranges = LiftoEditorBrain_computeStyledRanges(text);
      const spanOf = (needle: string): { start: number; end: number } | undefined =>
        ranges.find((r) => text.slice(r.start, r.end) === needle);
      expect(spanOf("3x8")).to.not.equal(undefined);
      expect(spanOf("100kg")).to.not.equal(undefined);
      expect(spanOf("60s")).to.not.equal(undefined);
      expect(spanOf("/")).to.not.equal(undefined);
    });

    it("nest-parses liftoscript bodies", () => {
      // The liftoscript grammar styles the number and its unit as separate nodes.
      const text = "Squat / 3x8 / update: custom() {~ weights += 2.5kg ~}";
      const ranges = LiftoEditorBrain_computeStyledRanges(text);
      expect(ranges.some((r) => text.slice(r.start, r.end) === "2.5")).to.equal(true);
      expect(ranges.some((r) => text.slice(r.start, r.end) === "weights")).to.equal(true);
    });

    it("flattens overlapping ranges into non-overlapping segments with later properties winning", () => {
      const flattened = LiftoEditorBrain_flattenRanges([
        { start: 0, end: 10, color: "red" },
        { start: 5, end: 15, bold: true },
      ]);
      expect(flattened).to.deep.equal([
        { start: 0, end: 5, color: "red" },
        { start: 5, end: 10, color: "red", bold: true },
        { start: 10, end: 15, bold: true },
      ]);
    });
  });
});
