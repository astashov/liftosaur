import "mocha";
import { expect } from "chai";
import {
  LiftoEditorActions_renameEdit,
  LiftoEditorActions_reuseTargetText,
  LiftoEditorActions_swapExerciseEdit,
} from "../src/components/primitives/liftoEditorActions";
import {
  LiftoEditorTestUtils_contextAt,
  LiftoEditorTestUtils_pillLabels,
  LiftoEditorTestUtils_pills,
  LiftoEditorTestUtils_pressPill,
} from "./utils/liftoEditorTestUtils";

describe("LiftoEditorActions", () => {
  describe("set group pills", () => {
    it("offers weight, rpe and timers only when the set group lacks them", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8", "3x8", "Set group");
      expect(labels).to.include.members(["Add weight", "Add RPE", "Add set timer", "Add rest timer", "Add auto"]);
    });

    it("hides what the set group already has", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 100lb @8 60s", "3x8", "Set group");
      expect(labels).to.not.include("Add weight");
      expect(labels).to.not.include("Add RPE");
      expect(labels).to.not.include("Add set timer");
      expect(labels).to.not.include("Add rest timer");
    });

    it("treats a set timer as having a timer", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 30s|60s", "3x8", "Set group");
      expect(labels).to.not.include("Add set timer");
      expect(labels).to.not.include("Add rest timer");
    });

    it("inserts a weight at the end of the set group", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: lp(5lb)", "3x8", "Set group", "Add weight")
      ).to.equal("Squat / 3x8 100lb / progress: lp(5lb)");
    });

    it("adds another set group after the current one", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 100lb", "3x8", "Set group", "Add another set group")).to.equal(
        "Squat / 3x8 100lb, 3x8"
      );
    });

    it("offers a set label only for real set groups", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat / 3x8", "3x8", "Set group")).to.include("Add set label");
      const globalsLabels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 / 100lb 60s", "100lb", "Globals");
      expect(globalsLabels).to.not.include("Add set label");
      expect(globalsLabels).to.not.include("Add another set group");
    });
  });

  describe("sets×reps pills", () => {
    it("turns fixed reps into a rep range", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8", "3x8", "Sets×Reps", "Make rep range")).to.equal(
        "Squat / 3x8-12"
      );
    });

    it("turns a rep range into fixed reps at the range max", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8-12", "3x8-12", "Sets×Reps", "Make fixed reps")).to.equal(
        "Squat / 3x12"
      );
    });

    it("also offers the enclosing set group's pills", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8", "3x8", "Sets×Reps");
      expect(labels[0]).to.equal("Make rep range");
      expect(labels).to.include.members(["Add weight", "Add RPE", "Add set timer", "Add rest timer"]);
    });
  });

  describe("timer pills", () => {
    it("splits a rest timer into a set/rest timer", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 90s", "90s", "Rest timer", "Split set/rest timer")).to.equal(
        "Squat / 3x8 30s|90s"
      );
    });

    it("collapses a set timer back to its rest part", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 30s|90s", "30s|90s", "Set timer", "Back to rest timer")
      ).to.equal("Squat / 3x8 90s");
    });

    it("falls back to 60s when the set timer's rest part is unknown", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 30s|?", "30s|?", "Set timer", "Back to rest timer")).to.equal(
        "Squat / 3x8 60s"
      );
    });

    it("also offers the enclosing set group's pills, minus timer adds", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 90s", "90s", "Rest timer");
      expect(labels[0]).to.equal("Split set/rest timer");
      expect(labels).to.include.members(["Add weight", "Add RPE"]);
      expect(labels).to.not.include.members(["Add set timer", "Add rest timer"]);
    });
  });

  describe("warmup pills", () => {
    it("adds another warmup set group", () => {
      expect(
        LiftoEditorTestUtils_pressPill(
          "Squat / 3x8 / warmup: 2x5 45%",
          "2x5",
          "Warmup sets",
          "Add another warmup set group"
        )
      ).to.equal("Squat / 3x8 / warmup: 2x5 45%, 1x5 50%");
    });

    it("converts warmups to none", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / warmup: 2x5 45%, 1x3 60%", "2x5", "Warmup sets", "Remove warmups")
      ).to.equal("Squat / 3x8 / warmup: none");
    });

    it("replaces warmup: none with default warmups", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / warmup: none", "none", "Warmup", "Add warmups")).to.equal(
        "Squat / 3x8 / warmup: 2x5 45%, 1x3 60%"
      );
    });
  });

  describe("progression pills", () => {
    it("lp with one argument offers success requirement and deload", () => {
      const text = "Squat / 3x8 / progress: lp(5lb)";
      expect(LiftoEditorTestUtils_pressPill(text, "lp", "lp()", "Require 2 successes")).to.equal(
        "Squat / 3x8 / progress: lp(5lb, 2, 0)"
      );
      expect(LiftoEditorTestUtils_pressPill(text, "lp", "lp()", "Add deload on failure")).to.equal(
        "Squat / 3x8 / progress: lp(5lb, 1, 0, 5lb, 3, 0)"
      );
    });

    it("lp pads deload arguments based on what's present", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: lp(5lb, 2, 0)", "lp", "lp()", "Add deload on failure")
      ).to.equal("Squat / 3x8 / progress: lp(5lb, 2, 0, 5lb, 3, 0)");
    });

    it("lp with full arguments offers neither", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 / progress: lp(5lb, 2, 0, 10lb, 3, 0)", "lp", "lp()");
      expect(labels).to.not.include("Require 2 successes");
      expect(labels).to.not.include("Add deload on failure");
    });

    it("offers switching to the other progression types", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 / progress: lp(5lb)", "lp", "Progress");
      expect(labels).to.include.members(["Switch to dp", "Switch to sum", "Switch to custom"]);
      expect(labels).to.not.include("Switch to lp");
    });

    it("offers no state var pill on update custom()", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / 3x8 / update: custom() {~ ~}", "custom", "custom()");
      expect(labels).to.not.include("Add state var");
    });

    it("offers progressions on progress: none", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: none", "none", "Progress", "Switch to lp")
      ).to.equal("Squat / 3x8 / progress: lp(5lb)");
      expect(LiftoEditorTestUtils_pillLabels("Squat / 3x8 / progress: none", "none", "Progress")).to.not.include(
        "Switch to none"
      );
    });

    it("switches a progression to none", () => {
      expect(
        LiftoEditorTestUtils_pressPill(
          "Squat / 3x8 / progress: custom(foo: 1) {~ weights += 5lb ~}",
          "custom",
          "Progress",
          "Switch to none"
        )
      ).to.equal("Squat / 3x8 / progress: none");
    });

    it("switching replaces the whole function call", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: lp(5lb, 2, 0)", "lp", "Progress", "Switch to dp")
      ).to.equal("Squat / 3x8 / progress: dp(5lb, 8, 12)");
    });

    it("custom() gets a state var inside empty parens", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: custom() {~ ~}", "custom", "custom()", "Add state var")
      ).to.equal("Squat / 3x8 / progress: custom(myvar: 0) {~ ~}");
    });

    it("custom() appends a state var after existing ones", () => {
      expect(
        LiftoEditorTestUtils_pressPill(
          "Squat / 3x8 / progress: custom(x: 1) {~ ~}",
          "custom",
          "custom()",
          "Add state var"
        )
      ).to.equal("Squat / 3x8 / progress: custom(x: 1, myvar: 0) {~ ~}");
    });

    it("custom without a body inserts the reuse template after it", () => {
      expect(
        LiftoEditorTestUtils_pressPill(
          "Squat / 3x8 / progress: custom(x: 1)",
          "custom",
          "custom()",
          "Reuse script from…"
        )
      ).to.equal("Squat / 3x8 / progress: custom(x: 1) { ...Squat }");
    });
  });

  describe("state variable pills", () => {
    it("offers renaming the variable and making its number a weight", () => {
      const text = "Squat / 3x8 / progress: custom(rating: 1) {~ ~}";
      const kvPills = LiftoEditorTestUtils_pills(text, "rating", "rating");
      const rename = kvPills.find((p) => p.label === "Rename…");
      expect(rename?.action).to.equal("rename");
      expect(rename?.text).to.equal("rating");
      expect(LiftoEditorTestUtils_pressPill(text, "rating", "rating", "Make weight")).to.equal(
        "Squat / 3x8 / progress: custom(rating: 1lb) {~ ~}"
      );
    });

    it("makes a weight value a plain number", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / 3x8 / progress: custom(inc: 2.5lb) {~ ~}", "inc", "inc", "Make number")
      ).to.equal("Squat / 3x8 / progress: custom(inc: 2.5) {~ ~}");
    });
  });

  describe("reuse pills", () => {
    it("offers editing the reused exercise as an action pill", () => {
      const reusePills = LiftoEditorTestUtils_pills("Squat / ...Bench Press", "...Bench", "Reuse");
      const edit = reusePills.find((p) => p.label === "Edit reused exercise…");
      expect(edit?.action).to.equal("editReuse");
      expect(edit?.text).to.equal("Bench Press");
    });

    it("offers a week/day only when there is none", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat / ...Bench Press", "...Bench", "Reuse", "From specific week/day…")
      ).to.equal("Squat / ...Bench Press[1:1]");
      expect(LiftoEditorTestUtils_pillLabels("Squat / ...Bench Press[2:1]", "...Bench", "Reuse")).to.not.include(
        "From specific week/day…"
      );
    });

    it("offers overriding sets only when the exercise has no own sets", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / ...Bench Press", "...Bench", "Reuse", "Override sets")).to.equal(
        "Squat / ...Bench Press / 3x8"
      );
      expect(LiftoEditorTestUtils_pillLabels("Squat / ...Bench Press / 5x5", "...Bench", "Reuse")).to.not.include(
        "Override sets"
      );
    });

    it("offers changing the reuse target, including its week/day", () => {
      const pills = LiftoEditorTestUtils_pills("Squat / ...Bench Press[2:1] / 3x8", "...Bench", "Reuse");
      const change = pills.find((p) => p.label === "Change…");
      expect(change?.action).to.equal("reuseSets");
      expect(change?.text).to.equal("...Bench Press[2:1]");
    });

    it("offers changing a script reuse via that property's picker", () => {
      const progressPills = LiftoEditorTestUtils_pills(
        "Squat / 3x8 / progress: custom() { ...Bench Press }",
        "...Bench",
        "Reuse"
      );
      expect(progressPills.find((p) => p.label === "Change…")?.action).to.equal("reuseProgressScript");
      expect(progressPills.map((p) => p.label)).to.not.include.members(["From specific week/day…", "Override sets"]);
      const updatePills = LiftoEditorTestUtils_pills(
        "Squat / 3x8 / update: custom() { ...Bench Press }",
        "...Bench",
        "Reuse"
      );
      expect(updatePills.find((p) => p.label === "Change…")?.action).to.equal("reuseUpdateScript");
    });

    it("Reuse… routes through the picker with a template fallback", () => {
      const pills = LiftoEditorTestUtils_pills("Squat / 3x8", "Squat", "Squat");
      const reuse = pills.find((p) => p.label === "Reuse…");
      expect(reuse?.action).to.equal("reuseSets");
      expect(reuse?.text).to.equal(" / ...Squat");
      expect(reuse?.reuseTemplate).to.equal(" / {target}");
    });

    it("Reuse script from… carries which property's scripts to pick", () => {
      const progressPills = LiftoEditorTestUtils_pills("Squat / 3x8 / progress: custom()", "custom", "custom()");
      expect(progressPills.find((p) => p.label === "Reuse script from…")?.action).to.equal("reuseProgressScript");
      const updatePills = LiftoEditorTestUtils_pills("Squat / 3x8 / update: custom()", "custom", "custom()");
      expect(updatePills.find((p) => p.label === "Reuse script from…")?.action).to.equal("reuseUpdateScript");
    });

    it("Reuse script from… on a custom() with a body swaps the body", () => {
      const pills = LiftoEditorTestUtils_pills(
        "Squat / 3x8 / progress: custom() {~ weights += 5lb ~}",
        "custom",
        "custom()"
      );
      const reuse = pills.find((p) => p.label === "Reuse script from…");
      expect(reuse?.action).to.equal("reuseProgressScript");
      expect(reuse?.text).to.equal("{~ weights += 5lb ~}");
      expect(reuse?.reuseTemplate).to.equal("{ {target} }");
      const updatePills = LiftoEditorTestUtils_pills(
        "Squat / 3x8 / update: custom() {~ weights = 5lb ~}",
        "custom",
        "custom()"
      );
      expect(updatePills.find((p) => p.label === "Reuse script from…")?.action).to.equal("reuseUpdateScript");
    });

    it("builds reuse target text with week/day only when the selection carries them", () => {
      expect(LiftoEditorActions_reuseTargetText({ fullName: "Bench Press" })).to.equal("...Bench Press");
      expect(LiftoEditorActions_reuseTargetText({ fullName: "Bench Press", day: 2 })).to.equal("...Bench Press[2]");
      expect(LiftoEditorActions_reuseTargetText({ fullName: "Bench Press", week: 2, day: 1 })).to.equal(
        "...Bench Press[2:1]"
      );
    });
  });

  describe("exercise pills", () => {
    it("offers the missing sections and hides the present ones", () => {
      const bare = LiftoEditorTestUtils_pillLabels("Squat / 3x8", "Squat", "Squat");
      expect(bare).to.include.members([
        "Change exercise…",
        "Add warmups",
        "Add used: none",
        "Add label",
        "Add set variation",
        "Add globals",
        "Add id: tags",
        "Reuse…",
        "Repeat…",
        "Add forced order…",
        "Enable superset",
        "Add progress",
        "Add update",
      ]);

      const full =
        "prefix: Squat[1-2] / 3x8 / 100lb / warmup: 2x5 45% / used: none / id: tags(1) / ...Bench / superset: A / progress: lp(5lb) / update: custom() {~ ~}";
      const fullLabels = LiftoEditorTestUtils_pillLabels(full, "3x8", "prefix: Squat");
      for (const label of [
        "Add warmups",
        "Add used: none",
        "Add label",
        "Add globals",
        "Add id: tags",
        "Reuse…",
        "Repeat…",
        "Add forced order…",
        "Enable superset",
        "Add progress",
        "Add update",
      ]) {
        expect(fullLabels, label).to.not.include(label);
      }
    });

    it("offers adding sets when the exercise has none", () => {
      const labels = LiftoEditorTestUtils_pillLabels("Squat / used: none", "Squat", "Squat");
      expect(labels).to.include("Add sets");
      expect(labels).to.not.include("Add set variation");
      expect(labels).to.not.include("Add globals");
    });

    it("change exercise targets the exercise name", () => {
      const exercisePills = LiftoEditorTestUtils_pills("Squat / 3x8", "Squat", "Squat");
      const change = exercisePills.find((p) => p.label === "Change exercise…");
      expect(change?.action).to.equal("changeExercise");
      expect(change?.text).to.equal("Squat");
      expect(change?.start).to.equal(0);
      expect(change?.end).to.equal("Squat".length);
    });

    it("appends a set variation after the last set-group section, not the globals", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / 100lb 60s", "Squat", "Squat", "Add set variation")).to.equal(
        "Squat / 3x8 / 3x8 / 100lb 60s"
      );
    });

    it("repeat and forced order insert after the name", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8", "Squat", "Squat", "Repeat…")).to.equal("Squat[1-4] / 3x8");
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8", "Squat", "Squat", "Add forced order…")).to.equal(
        "Squat[1] / 3x8"
      );
    });

    it("inserts sections at the end of the exercise line, not the program", () => {
      const text = "Squat / 3x8\nBench Press / 5x5";
      expect(LiftoEditorTestUtils_pressPill(text, "3x8", "Squat", "Add progress")).to.equal(
        "Squat / 3x8 / progress: lp(5lb)\nBench Press / 5x5"
      );
    });
  });

  describe("set variation make current", () => {
    it("marks a non-first variation with !", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / 5x5 100lb", "5x5", "Sets 2", "Make current")).to.equal(
        "Squat / 3x8 / ! 5x5 100lb"
      );
    });

    it("makes the first variation current by unmarking the other", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / ! 5x5 100lb", "3x8", "Sets 1", "Make current")).to.equal(
        "Squat / 3x8 / 5x5 100lb"
      );
    });

    it("moves the marker between non-first variations in one press", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / ! 5x5 / 10x1", "10x1", "Sets 3", "Make current")).to.equal(
        "Squat / 3x8 / 5x5 / ! 10x1"
      );
    });

    it("offers no pill on the current variation", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat / 3x8 / ! 5x5", "5x5", "Sets 2")).to.not.include("Make current");
      expect(LiftoEditorTestUtils_pillLabels("Squat / 3x8 / 5x5", "3x8", "Sets 1")).to.not.include("Make current");
    });

    it("offers no pill for a single variation", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat / 3x8", "3x8", "Sets")).to.not.include("Make current");
    });

    it("does not count a globals section as a variation", () => {
      expect(LiftoEditorTestUtils_pressPill("Squat / 3x8 / 5x5 / 100lb 60s", "5x5", "Sets 2", "Make current")).to.equal(
        "Squat / 3x8 / ! 5x5 / 100lb 60s"
      );
    });
  });

  describe("exercise variation pills", () => {
    it("marks a non-first variation with !", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat | Front Squat / 3x8", "Front Squat", "Variation 2", "Make current")
      ).to.equal("Squat | ! Front Squat / 3x8");
    });

    it("makes the first variation current by unmarking the other", () => {
      expect(
        LiftoEditorTestUtils_pressPill("Squat | ! Front Squat / 3x8", "Squat", "Variation 1", "Make current")
      ).to.equal("Squat | Front Squat / 3x8");
    });

    it("moves the marker between non-first variations in one press", () => {
      expect(
        LiftoEditorTestUtils_pressPill(
          "Squat | ! Pistol Squat | Front Squat / 3x8",
          "Front Squat",
          "Variation 3",
          "Make current"
        )
      ).to.equal("Squat | Pistol Squat | ! Front Squat / 3x8");
    });

    it("offers no pill on the current variation", () => {
      expect(
        LiftoEditorTestUtils_pillLabels("Squat | ! Front Squat / 3x8", "Front Squat", "Variation 2")
      ).to.not.include("Make current");
    });

    it("change exercise targets the focused variation's name", () => {
      const variationPills = LiftoEditorTestUtils_pills("Squat | Front Squat / 3x8", "Front Squat", "Variation 2");
      const change = variationPills.find((p) => p.label === "Change exercise…");
      expect(change?.action).to.equal("changeExercise");
      expect(change?.text).to.equal("Front Squat");
    });
  });

  describe("label pills", () => {
    it("offers renaming the label when tapping its prefix", () => {
      const labelPills = LiftoEditorTestUtils_pills("aux: Squat / 3x8", "aux", "Label");
      const rename = labelPills.find((p) => p.label === "Rename…");
      expect(rename?.action).to.equal("rename");
      expect(rename?.text).to.equal("aux");
    });

    it("offers renaming a set label", () => {
      const labelPills = LiftoEditorTestUtils_pills("Squat / 3x8 (myo)", "(myo", "Set label");
      const rename = labelPills.find((p) => p.label === "Rename…");
      expect(rename?.action).to.equal("rename");
      expect(rename?.text).to.equal("myo");
    });

    it("a repeat offers only adding forced order", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat[1-4] / 3x8", "1-4", "Repeat")).to.deep.equal(["Add forced order…"]);
      expect(LiftoEditorTestUtils_pressPill("Squat[1-4] / 3x8", "1-4", "Repeat", "Add forced order…")).to.equal(
        "Squat[1-4,1] / 3x8"
      );
    });

    it("a forced order offers only adding repeat", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat[2] / 3x8", "2", "Repeat")).to.deep.equal(["Repeat…"]);
      expect(LiftoEditorTestUtils_pressPill("Squat[2] / 3x8", "2", "Repeat", "Repeat…")).to.equal("Squat[1-4,2] / 3x8");
    });

    it("a repeat with forced order offers nothing", () => {
      expect(LiftoEditorTestUtils_pillLabels("Squat[1-4,2] / 3x8", "1-4", "Repeat")).to.deep.equal([]);
    });

    it("offers only renaming the superset group", () => {
      const supersetPills = LiftoEditorTestUtils_pills("Squat / 3x8 / superset: A", "superset", "Superset");
      expect(supersetPills.map((p) => p.label)).to.deep.equal(["Rename…"]);
      expect(supersetPills[0].action).to.equal("rename");
      expect(supersetPills[0].text).to.equal("A");
    });
  });

  describe("action pill fulfillment", () => {
    it("swapping keeps an existing label unless the picked name carries one", () => {
      const target = { start: 0, end: 10, text: "aux: Squat" };
      expect(LiftoEditorActions_swapExerciseEdit(target, "Bench Press")).to.deep.equal({
        start: 0,
        end: 10,
        text: "aux: Bench Press",
      });
      expect(LiftoEditorActions_swapExerciseEdit(target, "main: Bench Press").text).to.equal("main: Bench Press");
      expect(LiftoEditorActions_swapExerciseEdit({ start: 0, end: 5, text: "Squat" }, "Bench Press").text).to.equal(
        "Bench Press"
      );
    });

    it("renaming strips characters that would break out of the token", () => {
      const target = { start: 0, end: 3, text: "aux" };
      expect(LiftoEditorActions_renameEdit(target, " ma(in): b/c ")?.text).to.equal("main bc");
      expect(LiftoEditorActions_renameEdit(target, "():/")).to.equal(undefined);
    });
  });

  describe("pill boundaries", () => {
    it("used: none shows the property level with no pills instead of exercise pills", () => {
      const context = LiftoEditorTestUtils_contextAt("Squat / 3x8 / used: none", "none");
      const usedLevel = context.levels.find((l) => l.label === "Used");
      expect(usedLevel?.pills).to.deep.equal([]);
    });
  });
});
