import "mocha";
import { expect } from "chai";
import {
  IEditorToken,
  ILiftoEditorStyledRange,
  LiftoEditorBrain_computeStyledRanges,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_dayDataAt,
  LiftoEditorBrain_diffStyledRanges,
  LiftoEditorBrain_flattenRanges,
  LiftoEditorBrain_shiftStyledRanges,
  LiftoEditorBrain_stepToken,
  LiftoEditorBrain_tokens,
  LiftoEditorParseCache,
} from "../src/components/primitives/liftoEditorBrain";
import { LiftoEditorTestUtils_contextAt, LiftoEditorTestUtils_pos } from "./utils/liftoEditorTestUtils";

function breadcrumbAt(text: string, needle: string, occurrence: number = 0): string[] {
  return LiftoEditorTestUtils_contextAt(text, needle, occurrence).breadcrumb;
}

function tokenAt(text: string, needle: string, occurrence: number = 0): IEditorToken | undefined {
  const index = LiftoEditorTestUtils_pos(text, needle, occurrence);
  return LiftoEditorBrain_tokens(new LiftoEditorParseCache(), text).find(
    (t) => index >= t.start && index <= t.end && t.text === needle
  );
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

    it("labels week and day lines with their own names", () => {
      const text = "# Week 1\n## Day 1\nSquat / 3x8";
      expect(breadcrumbAt(text, "# Week 1")).to.deep.equal(["Week 1"]);
      expect(breadcrumbAt(text, "## Day 1")).to.deep.equal(["Day 1"]);
    });

    it("falls back to the generic label for an unnamed week or day", () => {
      expect(breadcrumbAt("#\nSquat / 3x8", "#")).to.deep.equal(["Week"]);
    });

    it("returns no levels outside any node", () => {
      expect(LiftoEditorBrain_contextAt(new LiftoEditorParseCache(), "", 0).levels).to.deep.equal([]);
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

  describe("dayDataAt", () => {
    const program = "# Week 1\n## Day 1\nSquat / 3x8\n\n## Day 2\nBench Press / 5x5\n\n# Week 2\n## Day 1\nSquat / 3x5";

    it("attributes an offset to the day whose headers precede it", () => {
      expect(LiftoEditorBrain_dayDataAt(program, LiftoEditorTestUtils_pos(program, "3x8"))).to.deep.equal({
        week: 1,
        dayInWeek: 1,
        day: 1,
      });
      expect(LiftoEditorBrain_dayDataAt(program, LiftoEditorTestUtils_pos(program, "5x5"))).to.deep.equal({
        week: 1,
        dayInWeek: 2,
        day: 2,
      });
      expect(LiftoEditorBrain_dayDataAt(program, LiftoEditorTestUtils_pos(program, "3x5"))).to.deep.equal({
        week: 2,
        dayInWeek: 1,
        day: 3,
      });
    });

    it("counts the header the offset is inside of", () => {
      expect(LiftoEditorBrain_dayDataAt(program, LiftoEditorTestUtils_pos(program, "Day 2"))).to.deep.equal({
        week: 1,
        dayInWeek: 2,
        day: 2,
      });
    });

    it("falls back to the first day for text with no headers", () => {
      expect(LiftoEditorBrain_dayDataAt("Squat / 3x8", 5)).to.deep.equal({ week: 1, dayInWeek: 1, day: 1 });
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
      const ranges = LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), text);
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
      const ranges = LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), text);
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

    it("matches the reference flatten on dense overlapping range sets", () => {
      const reference = (ranges: ILiftoEditorStyledRange[]): ILiftoEditorStyledRange[] => {
        const boundaries = Array.from(new Set(ranges.flatMap((r) => [r.start, r.end]))).sort((a, b) => a - b);
        const result: ILiftoEditorStyledRange[] = [];
        for (let i = 0; i < boundaries.length - 1; i += 1) {
          const start = boundaries[i];
          const end = boundaries[i + 1];
          const covering = ranges.filter((r) => r.start <= start && r.end >= end);
          if (covering.length === 0) {
            continue;
          }
          result.push(
            covering.reduce<ILiftoEditorStyledRange>((acc, r) => ({ ...acc, ...r, start, end }), { start, end })
          );
        }
        return result;
      };
      let seed = 42;
      const rand = (): number => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const ranges: ILiftoEditorStyledRange[] = [];
      for (let i = 0; i < 300; i += 1) {
        const start = Math.floor(rand() * 120);
        const end = start + 1 + Math.floor(rand() * 25);
        ranges.push({ start, end, ...(rand() > 0.5 ? { color: `c${i % 7}` } : { bold: true }) });
      }
      expect(LiftoEditorBrain_flattenRanges(ranges)).to.deep.equal(reference(ranges));
    });

    it("incremental reparse over successive edits matches a from-scratch parse", () => {
      const full =
        "Squat / 3x8 100lb 60s, 1x5 @8 / warmup: 1x10 45% / progress: custom(inc: 5lb) {~ weights += state.inc ~}";
      // Char-by-char build-up drives the prefix/suffix diff + TreeFragment reuse path on
      // every step; the fresh cache below has nothing to reuse, so it parses from scratch.
      const typed = new LiftoEditorParseCache();
      for (let i = 1; i <= full.length; i += 1) {
        LiftoEditorBrain_computeStyledRanges(typed, full.slice(0, i));
      }
      const caretAt = full.indexOf("100lb") + 1;
      expect(LiftoEditorBrain_computeStyledRanges(typed, full)).to.deep.equal(
        LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), full)
      );
      expect(LiftoEditorBrain_tokens(typed, full)).to.deep.equal(
        LiftoEditorBrain_tokens(new LiftoEditorParseCache(), full)
      );
      expect(LiftoEditorBrain_contextAt(typed, full, caretAt).breadcrumb).to.deep.equal(
        LiftoEditorBrain_contextAt(new LiftoEditorParseCache(), full, caretAt).breadcrumb
      );
    });

    it("shifts ranges for edits like the native stores do", () => {
      const ranges: ILiftoEditorStyledRange[] = [
        { start: 0, end: 5, color: "a" },
        { start: 8, end: 12, color: "b" },
        { start: 20, end: 25, color: "c" },
      ];
      // Insertion before everything shifts all; straddling range grows; deletion swallowing
      // a range drops it; same-length replacement is a no-op.
      expect(LiftoEditorBrain_shiftStyledRanges(ranges, 0, 0, 3).map((r) => [r.start, r.end])).to.deep.equal([
        [3, 8],
        [11, 15],
        [23, 28],
      ]);
      expect(LiftoEditorBrain_shiftStyledRanges(ranges, 10, 10, 2).map((r) => [r.start, r.end])).to.deep.equal([
        [0, 5],
        [8, 14],
        [22, 27],
      ]);
      expect(LiftoEditorBrain_shiftStyledRanges(ranges, 7, 13, 0).map((r) => [r.start, r.end])).to.deep.equal([
        [0, 5],
        [14, 19],
      ]);
      expect(LiftoEditorBrain_shiftStyledRanges(ranges, 8, 12, 4)).to.deep.equal(ranges);
    });

    describe("diffStyledRanges", () => {
      // What both native stores do with a patch: drop ranges starting inside the window,
      // splice the patch's ranges in.
      function applyPatch(
        mirror: ILiftoEditorStyledRange[],
        patch: { start: number; end: number; ranges: ILiftoEditorStyledRange[] }
      ): ILiftoEditorStyledRange[] {
        const kept = mirror.filter((r) => r.start < patch.start || r.start >= patch.end);
        return [...kept, ...patch.ranges].sort((a, b) => a.start - b.start);
      }

      it("returns unchanged for identical range sets", () => {
        const ranges = LiftoEditorBrain_flattenRanges(
          LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), "Squat / 3x8 100lb 60s")
        );
        expect(LiftoEditorBrain_diffStyledRanges(ranges, [...ranges])).to.equal("unchanged");
      });

      it("produces a patch that reproduces the fresh ranges when applied to the shifted mirror", () => {
        const before = "Squat / 3x8 100lb 60s / progress: lp(5lb)\nBench Press / 5x5 60kg\nDeadlift / 1x5 140kg";
        const edits: [number, number, string][] = [
          [before.indexOf("100lb"), before.indexOf("100lb") + 5, "102.5lb"],
          [before.indexOf("5x5"), before.indexOf("5x5") + 3, "3x3, 1x1"],
          [before.indexOf(" 60s"), before.indexOf(" 60s") + 4, ""],
          [before.indexOf("140kg") + 5, before.indexOf("140kg") + 5, " @9"],
        ];
        for (const [start, end, inserted] of edits) {
          const previous = LiftoEditorBrain_flattenRanges(
            LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), before)
          );
          const after = before.slice(0, start) + inserted + before.slice(end);
          const next = LiftoEditorBrain_flattenRanges(
            LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), after)
          );
          const mirror = LiftoEditorBrain_shiftStyledRanges(previous, start, end, inserted.length);
          const diff = LiftoEditorBrain_diffStyledRanges(mirror, next, { start, end: start + inserted.length });
          // "unchanged" is legal only when the shift alone already reproduced the fresh
          // ranges (pure deletions do this) — the native store did the same shift.
          if (diff === "unchanged") {
            expect(mirror).to.deep.equal(next);
          } else {
            expect(diff).to.not.equal("full");
            if (diff !== "full") {
              expect(applyPatch(mirror, diff)).to.deep.equal(next);
              expect(diff.ranges.length).to.be.lessThan(next.length);
            }
          }
        }
      });

      it("forces ranges intersecting the edited span into the window even when they compare equal", () => {
        const mirror: ILiftoEditorStyledRange[] = [
          { start: 0, end: 5, color: "a" },
          { start: 10, end: 15, color: "b" },
          { start: 20, end: 25, color: "c" },
        ];
        const diff = LiftoEditorBrain_diffStyledRanges(mirror, [...mirror], { start: 12, end: 14 });
        expect(diff).to.not.equal("unchanged");
        if (diff !== "unchanged" && diff !== "full") {
          expect(diff.start).to.be.at.most(10);
          expect(diff.end).to.be.greaterThan(10);
          expect(diff.ranges).to.deep.equal([{ start: 10, end: 15, color: "b" }]);
        }
      });

      it("falls back to full when most of the document changed", () => {
        const previous = LiftoEditorBrain_flattenRanges(
          LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), "Squat / 3x8 100lb 60s")
        );
        const next = previous.map((r) => ({ ...r, color: "changed" }));
        expect(LiftoEditorBrain_diffStyledRanges(previous, next)).to.equal("full");
      });

      it("handles pure additions and removals at the edges", () => {
        const base: ILiftoEditorStyledRange[] = [
          { start: 5, end: 10, color: "a" },
          { start: 12, end: 18, color: "b" },
          { start: 20, end: 30, color: "c" },
          { start: 32, end: 40, color: "d" },
        ];
        const withHighlight = [...base.slice(0, 2), { start: 18, end: 19, backgroundColor: "h" }, ...base.slice(2)];
        const diff = LiftoEditorBrain_diffStyledRanges(base, withHighlight);
        expect(diff).to.not.equal("unchanged");
        if (diff !== "unchanged" && diff !== "full") {
          expect(applyPatch(base, diff)).to.deep.equal(withHighlight);
        }
        const removal = LiftoEditorBrain_diffStyledRanges(withHighlight, base);
        expect(removal).to.not.equal("unchanged");
        if (removal !== "unchanged" && removal !== "full") {
          expect(applyPatch(withHighlight, removal)).to.deep.equal(base);
        }
      });
    });

    it("keeps two caches independent so concurrent editors don't evict each other", () => {
      const a = "Squat / 3x8 100lb / progress: lp(5lb)";
      const b = "# Week 2\n## Day 1\nBench Press / 5x5 60kg 90s";
      const cacheA = new LiftoEditorParseCache();
      const cacheB = new LiftoEditorParseCache();
      // Alternating documents through one cache is what used to thrash the single global
      // slot; with a cache each, both keep their own tree and stay correct.
      for (let i = 0; i < 3; i += 1) {
        LiftoEditorBrain_computeStyledRanges(cacheA, a);
        LiftoEditorBrain_computeStyledRanges(cacheB, b);
      }
      expect(LiftoEditorBrain_computeStyledRanges(cacheA, a)).to.deep.equal(
        LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), a)
      );
      expect(LiftoEditorBrain_computeStyledRanges(cacheB, b)).to.deep.equal(
        LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), b)
      );
    });

    it("incremental reparse handles mid-text edits, deletions and replacements", () => {
      const base =
        "Squat / 3x8 100lb / progress: lp(5lb)\nBench Press / 5x5 60kg 90s / update: custom() {~ weights = 1lb ~}";
      const variants = [
        base.replace("100lb", "102.5lb"),
        base.replace(" 90s", ""),
        base.replace("3x8", "3x8, 2x5"),
        base.replace("Bench Press", "Overhead Press"),
        base.slice(0, base.indexOf("\n")),
      ];
      for (const variant of variants) {
        const edited = new LiftoEditorParseCache();
        LiftoEditorBrain_computeStyledRanges(edited, base);
        expect(LiftoEditorBrain_computeStyledRanges(edited, variant)).to.deep.equal(
          LiftoEditorBrain_computeStyledRanges(new LiftoEditorParseCache(), variant)
        );
      }
    });
  });
});
