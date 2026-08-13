import "mocha";
import { expect } from "chai";
import {
  LiftoEditorStateVars_context,
  LiftoEditorStateVars_contextFor,
  LiftoEditorStateVars_fromEntries,
  LiftoEditorStateVars_isUsed,
  LiftoEditorStateVars_nameError,
  LiftoEditorStateVars_print,
  LiftoEditorStateVars_remove,
  LiftoEditorStateVars_rows,
  LiftoEditorStateVars_sanitizeName,
  LiftoEditorStateVars_set,
} from "../src/components/primitives/liftoEditorStateVars";
import type { ILiftoEditorStateVarsTarget } from "../src/components/primitives/liftoEditorActions";
import { LiftoEditorTestUtils_pills } from "./utils/liftoEditorTestUtils";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { Weight_build, Weight_buildPct } from "../src/models/weight";
import type { IPlannerProgramExercise } from "../src/pages/planner/models/types";

// What the pill hands over, read off the syntax tree.
function target(text: string): ILiftoEditorStateVarsTarget {
  const pill = LiftoEditorTestUtils_pills(text, "custom", "custom()").find((p) => p.label === "State vars…");
  if (pill?.stateVars == null) {
    throw new Error(`No state vars pill in "${text}"`);
  }
  return pill.stateVars;
}

describe("LiftoEditorStateVars", () => {
  describe("parsing and printing", () => {
    it("keeps the declaration order and the user-prompted marker", () => {
      const vars = LiftoEditorStateVars_fromEntries(
        target("Squat / 3x8 / progress: custom(rating: 1, inc+: 2.5lb, pct: 80%) {~ ~}").entries
      );
      expect(vars.map((v) => v.name)).to.eql(["rating", "inc", "pct"]);
      expect(vars[0].value).to.equal(1);
      expect(vars[1].value).to.eql(Weight_build(2.5, "lb"));
      expect(vars[1].userPrompted).to.equal(true);
      expect(vars[2].value).to.eql(Weight_buildPct(80));
    });

    it("round-trips every argument list it agrees to edit", () => {
      for (const args of ["rating: 1, inc+: 2.5lb, pct: 80%", "x: -2.5", "a: 1, b: 2"]) {
        const parsed = target(`Squat / 3x8 / progress: custom(${args}) {~ ~}`);
        expect(parsed.hasUnparsed, args).to.equal(false);
        expect(LiftoEditorStateVars_print(LiftoEditorStateVars_fromEntries(parsed.entries)), args).to.equal(args);
      }
    });

    it("reads an empty list", () => {
      expect(LiftoEditorStateVars_fromEntries([])).to.eql([]);
    });
  });

  describe("name validation", () => {
    it("accepts what both grammars accept", () => {
      for (const name of ["increment", "myVar2", "a_b_c", "x"]) {
        expect(LiftoEditorStateVars_nameError(name), name).to.equal(undefined);
      }
    });

    it("rejects names the declaration or the script couldn't hold", () => {
      // Spaces and punctuation break the KeyValue token; a leading digit or underscore
      // parses in the declaration but not as `state.name` in liftoscript.
      for (const name of ["", "my var", "my-var", "2fast", "_hidden", "a:b", "rate%"]) {
        expect(LiftoEditorStateVars_nameError(name), name).to.not.equal(undefined);
      }
    });

    it("rejects a name that is already declared", () => {
      expect(LiftoEditorStateVars_nameError("increment", ["increment"])).to.match(/already/);
      expect(LiftoEditorStateVars_nameError("increment", ["other"])).to.equal(undefined);
    });

    it("sanitizes a typed name down to a usable one", () => {
      expect(LiftoEditorStateVars_sanitizeName("my var")).to.equal("myvar");
      expect(LiftoEditorStateVars_sanitizeName("2 fast 2 furious")).to.equal("fast2furious");
      expect(LiftoEditorStateVars_sanitizeName("__")).to.equal("");
    });
  });

  describe("rows", () => {
    const defaults = { increment: Weight_build(5, "lb"), rating: 3 };

    it("shows inherited variables the exercise doesn't declare", () => {
      const rows = LiftoEditorStateVars_rows([], defaults);
      expect(rows.map((r) => [r.name, r.isDeclared])).to.eql([
        ["increment", false],
        ["rating", false],
      ]);
      expect(rows[0].value).to.eql(Weight_build(5, "lb"));
    });

    it("marks a declared variable as an override and keeps its default", () => {
      const declared = LiftoEditorStateVars_fromEntries([
        { name: "rating", value: "5", userPrompted: false },
        { name: "own", value: "1", userPrompted: false },
      ]);
      const rows = LiftoEditorStateVars_rows(declared, defaults);
      const rating = rows.find((r) => r.name === "rating");
      expect(rating?.isDeclared).to.equal(true);
      expect(rating?.value).to.equal(5);
      expect(rating?.defaultValue).to.equal(3);
      const own = rows.find((r) => r.name === "own");
      expect(own?.isDeclared).to.equal(true);
      expect(own?.defaultValue).to.equal(undefined);
    });

    it("declares an inherited variable when its value changes, and undeclares it on reset", () => {
      const vars = LiftoEditorStateVars_set([], "rating", { value: 5 });
      expect(LiftoEditorStateVars_print(vars)).to.equal("rating: 5");
      expect(LiftoEditorStateVars_print(LiftoEditorStateVars_remove(vars, "rating"))).to.equal("");
    });
  });

  describe("context", () => {
    const settings = Settings_build();

    function evaluate(text: string): IPlannerProgramExercise[] {
      const { program } = PlannerTestUtils_get(text);
      return Program_getAllProgramExercises(Program_evaluate(program, settings));
    }

    function exercise(exercises: IPlannerProgramExercise[], name: string): IPlannerProgramExercise {
      const found = exercises.find((e) => e.fullName === name);
      if (found == null) {
        throw new Error(`No exercise "${name}"`);
      }
      return found;
    }

    const program = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(increment: 5lb, rating: 3) {~ weights += state.increment ~}
Bench Press / 3x5 / 80lb / progress: custom(increment: 10lb) { ...Squat }
Overhead Press / 3x5 / 50lb / progress: custom(own: 1) {~ weights += 1lb ~} / update: custom() {~ state.own += 1 ~}
`;
    const exercises = evaluate(program);
    const empty: ILiftoEditorStateVarsTarget = { entries: [], hasUnparsed: false };

    it("resolves the defaults and the scripts of a reused progress", () => {
      const context = LiftoEditorStateVars_context(exercise(exercises, "Bench Press"));
      expect(context.sourceName).to.equal("Squat");
      expect(context.defaults).to.eql({ increment: Weight_build(5, "lb"), rating: 3 });
      expect(context.progressScript).to.equal("{~ weights += state.increment ~}");
    });

    it("inherits nothing when the progress is the exercise's own", () => {
      const context = LiftoEditorStateVars_context(exercise(exercises, "Overhead Press"));
      expect(context.sourceName).to.equal(undefined);
      expect(context.defaults).to.equal(undefined);
    });

    it("drops the evaluated reuse once the text spells out its own script", () => {
      const context = LiftoEditorStateVars_contextFor(
        { ...empty, progressScript: "{~ weights += 1lb ~}" },
        exercise(exercises, "Bench Press"),
        exercises,
        settings
      );
      expect(context.progressScript).to.equal("{~ weights += 1lb ~}");
      expect(context.defaults).to.equal(undefined);
    });

    it("follows the reuse target the text names now, not the one it was evaluated with", () => {
      // The text has been retargeted from Squat to Overhead Press since the last evaluation.
      const context = LiftoEditorStateVars_contextFor(
        { ...empty, progressReuse: "Overhead Press" },
        exercise(exercises, "Bench Press"),
        exercises,
        settings
      );
      expect(context.sourceName).to.equal("Overhead Press");
      expect(context.defaults).to.eql({ own: 1 });
      expect(context.progressScript).to.equal("{~ weights += 1lb ~}");
    });

    it("picks the reuse target by key, not by the name it shares with another variant", () => {
      const withVariants = `# Week 1
## Day 1
Squat, Smith Machine / used: none / 1x1 / progress: custom(x: 2) {~ ~}
Squat / used: none / 1x1 / progress: custom(x: 1) {~ ~}
Bench Press / 3x5 / 80lb / progress: custom() { ...Squat }
`;
      const all = evaluate(withVariants);
      const context = LiftoEditorStateVars_contextFor(
        { ...empty, progressReuse: "Squat" },
        exercise(all, "Bench Press"),
        all,
        settings
      );
      expect(context.sourceName).to.equal("Squat");
      expect(context.defaults).to.eql({ x: 1 });
    });

    it("contributes nothing when the named target doesn't resolve", () => {
      const context = LiftoEditorStateVars_contextFor(
        { ...empty, progressReuse: "Nonexistent" },
        undefined,
        exercises,
        settings
      );
      expect(context.sourceName).to.equal("Nonexistent");
      expect(context.defaults).to.equal(undefined);
      expect(context.progressScript).to.equal(undefined);
    });

    it("falls back to the evaluated exercise when the text names no body", () => {
      const context = LiftoEditorStateVars_contextFor(empty, exercise(exercises, "Bench Press"), exercises, settings);
      expect(context.sourceName).to.equal("Squat");
    });

    it("blocks deleting a variable only the update script mentions", () => {
      const text =
        "Squat / 3x5 / progress: custom(counter: 0) {~ weights += 5lb ~} / update: custom() {~ state.counter += 1 ~}";
      const context = LiftoEditorStateVars_contextFor(target(text), undefined, [], settings);
      expect(LiftoEditorStateVars_isUsed("counter", context)).to.equal(true);
      expect(LiftoEditorStateVars_isUsed("unused", context)).to.equal(false);
    });

    it("blocks it through a reused update script too", () => {
      const withReuse = `# Week 1
## Day 1
Overhead Press / 3x5 / 50lb / progress: custom(counter: 0) {~ ~} / update: custom() {~ state.counter += 1 ~}
Squat / 3x5 / 100lb / progress: custom(counter: 0) {~ weights += 5lb ~} / update: custom() { ...Overhead Press }
`;
      const all = evaluate(withReuse);
      const context = LiftoEditorStateVars_contextFor(
        {
          entries: [],
          hasUnparsed: false,
          progressScript: "{~ weights += 5lb ~}",
          updateReuse: "Overhead Press",
        },
        exercise(all, "Squat"),
        all,
        settings
      );
      expect(LiftoEditorStateVars_isUsed("counter", context)).to.equal(true);
    });

    it("carries the update script, which can use the state too", () => {
      const own = LiftoEditorStateVars_context(exercise(exercises, "Overhead Press"));
      expect(own.updateScript).to.equal("{~ state.own += 1 ~}");
      const retargeted = LiftoEditorStateVars_contextFor(
        { ...empty, updateReuse: "Overhead Press" },
        exercise(exercises, "Bench Press"),
        exercises,
        settings
      );
      expect(retargeted.updateScript).to.equal("{~ state.own += 1 ~}");
    });
  });
});
