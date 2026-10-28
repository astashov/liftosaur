import "mocha";
import { expect } from "chai";
import { Weight_build } from "../src/models/weight";
import {
  ParserTestUtils_run,
  ParserTestUtils_bdgs,
  ParserTestUtils_defaultBindings,
} from "../src/utils/parserTestUtils";
import { ObjectUtils_pick } from "../src/utils/object";
import { IScriptFnContext, Progress_createScriptFunctions } from "../src/models/progress";
import { ScriptRunner } from "../src/parser";
import { Settings_build } from "../src/models/settings";
import { ILiftoscriptScalar } from "../src/liftoscriptEvaluator";
import { PlannerKey_fromExerciseType } from "../src/pages/planner/plannerKey";

describe("Parser", () => {
  it("r[]", () => {
    const result = ParserTestUtils_run("r[state.foo]", { foo: 2 });
    expect(result).to.eql(2);
  });

  it("completedReps >= reps", () => {
    const state = { foo: 2 };
    ParserTestUtils_run(
      `if (completedReps >= reps) {
        state.foo = state.foo + 3
      }`,
      state
    );
    expect(state.foo).to.eql(5);
  });

  it("ternary", () => {
    expect(ParserTestUtils_run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 2 })).to.eql(6);
    expect(ParserTestUtils_run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 4 })).to.eql(4);
    expect(ParserTestUtils_run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 8 })).to.eql(5);
  });

  it("division and modulo by zero return 0", () => {
    expect(ParserTestUtils_run(`state.foo / 0`, { foo: 5 })).to.eql(0);
    expect(ParserTestUtils_run(`state.foo / (state.foo - 5)`, { foo: 5 })).to.eql(0);
    expect(ParserTestUtils_run(`(state.foo - 5) / (state.foo - 5)`, { foo: 5 })).to.eql(0);
    expect(ParserTestUtils_run(`state.foo % 0`, { foo: 5 })).to.eql(0);
    expect(ParserTestUtils_run(`state.weight / 0`, { weight: Weight_build(150, "lb") })).to.eql(Weight_build(0, "lb"));
    const state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(`state.weight = state.weight / 0`, state);
    expect(state.weight).to.eql(Weight_build(0, "lb"));
  });

  it("errors when passing an array to a function that doesn't accept arrays", () => {
    expect(() => ParserTestUtils_run(`state.foo = increment(weights)`, { foo: 0 })).to.throw(
      "Function 'increment' doesn't accept arrays, and 'weights' is an array"
    );
    expect(() => ParserTestUtils_run(`weights = increment(weights)`, { foo: 0 })).to.throw(
      "Function 'increment' doesn't accept arrays, and 'weights' is an array"
    );
    expect(() => ParserTestUtils_run(`state.foo = increment((completedReps))`, { foo: 0 })).to.throw(
      "Function 'increment' doesn't accept arrays"
    );
    expect(ParserTestUtils_run(`state.foo = sum(completedReps)`, { foo: 0 })).to.eql(6);
    expect(ParserTestUtils_run(`state.foo = increment(weights[1])`, { foo: 0 })).to.eql(Weight_build(41, "lb"));
  });

  it("errors on wrong number of function arguments", () => {
    expect(() => ParserTestUtils_run(`state.foo = increment()`, { foo: 0 })).to.throw(
      "Function 'increment' expects 1 argument, but got 0"
    );
    expect(() => ParserTestUtils_run(`state.foo = increment(5lb, 3)`, { foo: 0 })).to.throw(
      "Function 'increment' expects 1 argument, but got 2"
    );
    expect(() => ParserTestUtils_run(`state.foo = calculateTrainingMax(100lb)`, { foo: 0 })).to.throw(
      "Function 'calculateTrainingMax' expects 2 arguments, but got 1"
    );
  });

  it("errors on statically known wrong argument types", () => {
    expect(() => ParserTestUtils_run(`state.foo = calculateTrainingMax(100lb, 5lb)`, { foo: 0 })).to.throw(
      "Argument 2 (reps) of 'calculateTrainingMax' should be a number of reps, but '5lb' is a weight"
    );
  });

  it("errors at runtime on wrong argument types from dynamic values", () => {
    expect(() =>
      ParserTestUtils_run(`state.out = calculateTrainingMax(100lb, state.w)`, {
        out: 0,
        w: Weight_build(5, "lb"),
      })
    ).to.throw("Argument 2 (reps) of 'calculateTrainingMax' should be a number of reps, but got 5lb");
  });

  it("print returns its first argument, including booleans", () => {
    const state = { foo: 0 };
    ParserTestUtils_run(`if (print(completedReps >= reps)) { state.foo = 42 }`, state);
    expect(state.foo).to.eql(42);
    expect(ParserTestUtils_run(`state.foo = print(5)`, { foo: 0 })).to.eql(5);
  });

  it("treats rpe argument of rpeMultiplier as optional", () => {
    const withDefault = ParserTestUtils_run(`state.foo = rpeMultiplier(5)`, { foo: 0 });
    const explicit = ParserTestUtils_run(`state.foo = rpeMultiplier(5, 10)`, { foo: 0 });
    expect(withDefault).to.eql(explicit);
  });

  it("Standard progression and deload", () => {
    const program = `
// Simple Exercise Progression script '5lb,2'
if (completedReps >= reps) {
  state.successes = state.successes + 1
  if (state.successes >= 2) {
    state.weight = state.weight + 5lb
    state.successes = 0
    state.failures = 0
  }
}
// End Simple Exercise Progression script
// Simple Exercise Deload script '5lb,1'
if (!(completedReps >= reps)) {
  state.failures = state.failures + 1
  if (state.failures >= 1) {
    state.weight = state.weight - 5lb
    state.successes = 0
    state.failures = 0
  }
}
// End Simple Exercise Deload script`;
    let state = {
      successes: 0,
      failures: 0,
      weight: Weight_build(150, "lb"),
    };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 3, 150],
        ],
      })
    );
    expect(state).to.eql({ successes: 1, failures: 0, weight: Weight_build(150, "lb") });

    state = {
      successes: 2,
      failures: 0,
      weight: Weight_build(150, "lb"),
    };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 3, 150],
        ],
      })
    );
    expect(state).to.eql({ successes: 0, failures: 0, weight: Weight_build(155, "lb") });

    state = {
      successes: 1,
      failures: 2,
      weight: Weight_build(150, "lb"),
    };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 2, 150],
        ],
      })
    );
    expect(state).to.eql({ successes: 0, failures: 0, weight: Weight_build(145, "lb") });
  });

  it("Basic beginner", () => {
    const program = `
    if (cr[1] + cr[2] + cr[3] >= 15) {
      state.weight = w[3] +
        (cr[3] > 10 ? 5lb : 2.5lb)
    } else {
      state.weight = state.weight * 0.9
    }
    `;
    let state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(152.5, "lb") });

    state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 11, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(155, "lb") });

    state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 3, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(135, "lb") });
  });

  it("Basic beginner", () => {
    const program = `
    if (cr[1] + cr[2] + cr[3] >= 15) {
      state.weight = w[3] +
        (cr[3] > 10 ? 5lb : 2.5lb)
    } else {
      state.weight = state.weight * 0.9
    }
    `;
    let state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(152.5, "lb") });

    state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 11, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(155, "lb") });

    state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 3, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(135, "lb") });
  });

  it("GZCLP", () => {
    const program = `
    if (cr >= r) {
      state.weight = w[5] + 10lb
    } else if (state.stage < 3) {
      state.stage = state.stage + 1
    } else {
      state.stage = 1
      state.weight = state.weight * 0.85
    }
    `;
    let state = { stage: 1, weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ stage: 1, weight: Weight_build(160, "lb") });

    state = { stage: 1, weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 4, 150],
        ],
      })
    );
    expect(state).to.eql({ stage: 2, weight: Weight_build(150, "lb") });

    state = { stage: 3, weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 4, 150],
        ],
      })
    );
    expect(state).to.eql({ stage: 1, weight: Weight_build(127.5, "lb") });
  });

  it("condition with numbers", () => {
    const program = `
    if (cr[3] >= 25) {
      state.weight = state.weight + 5lb
    }
    `;
    let state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 30, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(155, "lb") });

    state = { weight: Weight_build(150, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ weight: Weight_build(150, "lb") });
  });

  it("SBS", () => {
    const program = `
    if (state.week != 7 && state.week != 14 && state.week != 21) {
      if (completedReps[4] > reps[4] + 4) {
        state.tm = state.tm * 1.03
      } else if (completedReps[4] < reps[4] - 1) {
        state.tm = state.tm * 0.95
      } else if (completedReps[4] < reps[4]) {
        state.tm = state.tm * 0.98
      } else if (completedReps[4] > reps[4]) {
        state.tm = state.tm * (1.0 + ((completedReps[4] - reps[4]) * 0.005))
      }
    }
    
    state.week = state.week + 1
    if (state.week > 21) {
      state.week = 1
    }
    
    if (state.week == 2) { state.intensity = 72.5 }
    if (state.week == 3) { state.intensity = 75 }
    if (state.week == 4) { state.intensity = 72.5 }
    if (state.week == 5) { state.intensity = 75 }
    if (state.week == 6) { state.intensity = 77.5 }
    if (state.week == 7) { state.intensity = 60 }
    if (state.week == 8) { state.intensity = 72.5 }
    if (state.week == 9) { state.intensity = 75 }
    if (state.week == 10) { state.intensity = 77.5 }
    if (state.week == 11) { state.intensity = 75 }
    if (state.week == 12) { state.intensity = 77.5 }
    if (state.week == 13) { state.intensity = 80 }
    if (state.week == 14) { state.intensity = 60 }
    if (state.week == 15) { state.intensity = 75 }
    if (state.week == 16) { state.intensity = 77.5 }
    if (state.week == 17) { state.intensity = 80 }
    if (state.week == 18) { state.intensity = 77.5 }
    if (state.week == 19) { state.intensity = 80 }
    if (state.week == 20) { state.intensity = 82.5 }
    if (state.week == 21) { state.intensity = 60 }
    
    if (state.intensity > 95) { state.lastrep = 1 }
    else if (state.intensity > 90) { state.lastrep = 2 }
    else if (state.intensity > 87.5) { state.lastrep = 3 }
    else if (state.intensity > 85) { state.lastrep = 4 }
    else if (state.intensity > 82.5) { state.lastrep = 5 }
    else if (state.intensity > 80) { state.lastrep = 6 }
    else if (state.intensity > 77.5) { state.lastrep = 8 }
    else if (state.intensity > 75) { state.lastrep = 9 }
    else if (state.intensity > 72.5) { state.lastrep = 10 }
    else if (state.intensity > 70) { state.lastrep = 11 }
    else if (state.intensity > 67.5) { state.lastrep = 12 }
    else if (state.intensity > 65) { state.lastrep = 13 }
    else if (state.intensity > 62.5) { state.lastrep = 15 }
    else if (state.intensity > 60) { state.lastrep = 16 }
    else if (state.intensity > 57.5) { state.lastrep = 18 }
    else if (state.intensity > 55) { state.lastrep = 19 }
    else if (state.intensity > 52.5) { state.lastrep = 21 }
    else if (state.intensity > 50) { state.lastrep = 23 }
    else { state.lastrep = 25 }
    
    if (state.intensity > 95) { state.reps = 1 }
    else if (state.intensity > 87.5) { state.reps = 2 }
    else if (state.intensity > 85) { state.reps = 3 }
    else if (state.intensity > 82.5) { state.reps = 4 }
    else if (state.intensity > 80) { state.reps = 5 }
    else if (state.intensity > 77.5) { state.reps = 6 }
    else if (state.intensity > 75) { state.reps = 7 }
    else if (state.intensity > 72.5) { state.reps = 8 }
    else if (state.intensity > 70) { state.reps = 9 }
    else if (state.intensity > 67.5) { state.reps = 10 }
    else if (state.intensity > 65) { state.reps = 11 }
    else if (state.intensity > 62.5) { state.reps = 12 }
    else if (state.intensity > 60) { state.reps = 13 }
    else if (state.intensity > 57.5) { state.reps = 14 }
    else if (state.intensity > 55) { state.reps = 15 }
    else if (state.intensity > 52.5) { state.reps = 17 }
    else if (state.intensity > 50) { state.reps = 18 }
    else { state.reps = 20 }
    `;

    const state = { tm: Weight_build(1000, "lb"), week: 1, intensity: 70, reps: 8, lastrep: 9 };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 6, 150],
        ],
      })
    );
    expect(ObjectUtils_pick(state, ["week", "intensity", "reps", "lastrep"])).to.eql({
      week: 2,
      intensity: 72.5,
      reps: 9,
      lastrep: 11,
    });
    expect(Math.round(state.tm.value)).to.eql(1005);
  });

  it("oneliner", () => {
    const program = `if (completedReps >= reps && state.lastsetrir>1) {state.reps=state.reps+1}`;
    const state = { lastsetrir: 3, reps: 5 };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ lastsetrir: 3, reps: 6 });
  });

  it("nested conditions", () => {
    const program = `
      if ((r[1] == 3 || r[1] == 6) && (((r[2] == 3 ? 1 == 1 : 1 == 2)))) {
        state.reps = 1 == 1 ? state.reps + 1 : state.reps + 2
      }
    `;
    const state = { reps: 5 };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [
          [6, 2, 150],
          [3, 5, 150],
        ],
      })
    );
    expect(state).to.eql({ reps: 6 });
  });

  it("fn in if", () => {
    const program = `
      if (2 > 1) {
        state.weight = roundWeight(state.weight * 0.323)
      }
    `;
    const state = { weight: Weight_build(1000, "lb") };
    const result = ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [[3, 5, 150]],
      })
    );
    expect(state).to.eql({ weight: Weight_build(323, "lb") });
    expect(result).to.eql(Weight_build(323, "lb"));
  });

  it("fn in assignment", () => {
    const program = `
      state.weight = roundWeight(state.weight * 0.323123)
    `;
    const state = { weight: Weight_build(1000, "lb") };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [[3, 5, 150]],
      })
    );
    expect(state).to.eql({ weight: Weight_build(323.1, "lb") });
  });

  it("nested conditions 2", () => {
    const program = `
    if (!(completedReps[1] >= reps[1] - 2)) {
      state.failures = state.failures + 1
    }
    `;
    const state = { failures: 0 };
    ParserTestUtils_run(
      program,
      state,
      ParserTestUtils_bdgs({
        results: [[8, 5, 150]],
      })
    );
    expect(state).to.eql({ failures: 1 });
  });

  describe("text", () => {
    it("joins text with +", () => {
      expect(ParserTestUtils_run(`"a" + "b"`, {})).to.eql("ab");
      expect(ParserTestUtils_run(`"e1RM: " + rm1`, {})).to.eql("e1RM: 100lb");
      expect(ParserTestUtils_run(`"x" + 1.234`, {})).to.eql("x1.23");
      expect(ParserTestUtils_run(`"x" + (1 == 1)`, {})).to.eql("xtrue");
      expect(ParserTestUtils_run(`5 + "x"`, {})).to.eql("5x");
    });

    it("compares text exactly", () => {
      expect(ParserTestUtils_run(`"a" == "a"`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"a" == "A"`, {})).to.eql(false);
      expect(ParserTestUtils_run(`"a" != "A"`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"5" == 5`, {})).to.eql(false);
      expect(ParserTestUtils_run(`"a" < "b"`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"b" >= "c"`, {})).to.eql(false);
    });

    it("uses JS truthiness in conditions and logic", () => {
      const state = { foo: 0, bar: 0 };
      ParserTestUtils_run(`if ("") { state.foo = 1 } if ("x") { state.bar = 1 }`, state);
      expect(state).to.eql({ foo: 0, bar: 1 });
      expect(ParserTestUtils_run(`!""`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"" || "x"`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"x" && ""`, {})).to.eql(false);
      expect(ParserTestUtils_run(`(1 == 1) && "x"`, {})).to.eql(true);
      expect(ParserTestUtils_run(`"" ? 1 : 2`, {})).to.eql(2);
    });

    it("keeps text in temporary variables", () => {
      expect(ParserTestUtils_run(`var.x = "heavy"\nvar.x += "!"\nvar.x`, {})).to.eql("heavy!");
      expect(ParserTestUtils_run(`var.ok = 1 == 1\nvar.ok + 1`, {})).to.eql(2);
    });

    it("rejects text arithmetic", () => {
      expect(() => ParserTestUtils_run(`"x" - 1`, {})).to.throw("Can't apply '-' to text");
      expect(() => ParserTestUtils_run(`"x" * 2`, {})).to.throw("Can't apply '*' to text");
      expect(() => ParserTestUtils_run(`var.x = "a"\nvar.x -= 1`, {})).to.throw("Can't apply '-' to text");
      expect(() => ParserTestUtils_run(`var.x = "a"\nvar.y = var.x * 2`, {})).to.throw("Can't apply '*' to text");
    });

    it("rejects comparing text to a number with < and >", () => {
      expect(() => ParserTestUtils_run(`"a" < 5`, {})).to.throw("Can't compare text with '<' to a number");
      expect(() => ParserTestUtils_run(`var.x = "a"\nvar.x > 5`, {})).to.throw("Can't compare text with '>'");
    });

    it("rejects text in state, set variables, rm1 and indexes", () => {
      expect(() => ParserTestUtils_run(`state.foo = "a"`, { foo: 0 })).to.throw("Text can't be used as 'state.foo'");
      expect(() => ParserTestUtils_run(`state.foo += ("a")`, { foo: 0 })).to.throw("Text can't be used");
      expect(() => ParserTestUtils_run(`weights = "a"`, {})).to.throw("Text can't be used as 'weights'");
      expect(() => ParserTestUtils_run(`rm1 = "a"`, {})).to.throw("Text can't be used as 'rm1'");
      expect(() => ParserTestUtils_run(`r["a"]`, {})).to.throw("Text can't be used as an index");
    });

    it("rejects visible text misuse even in a branch that never runs", () => {
      const never = (body: string): string => `if (1 == 2) { ${body} }`;
      expect(() => ParserTestUtils_run(never(`state.foo = "a"`), { foo: 0 })).to.throw("Text can't be used");
      expect(() => ParserTestUtils_run(never(`state.foo = ("a" + 1)`), { foo: 0 })).to.throw("Text can't be used");
      expect(() => ParserTestUtils_run(never(`var.x = "a" - 1`), {})).to.throw("Can't apply '-' to text");
      expect(() => ParserTestUtils_run(never(`var.x = r[exercise]`), {})).to.throw("Text can't be used as an index");
      expect(() => ParserTestUtils_run(never(`var.x = exercise < 5`), {})).to.throw("Can't compare text");
      expect(ParserTestUtils_run(never(`var.x = "a" == 5`), {})).to.eql(0);
    });

    it("rejects text that reaches state through a var at runtime", () => {
      const state = { foo: 0 };
      expect(() => ParserTestUtils_run(`var.x = "a"\nstate.foo = var.x`, state)).to.throw(
        "Text can't be used as state.foo"
      );
      expect(() => ParserTestUtils_run(`var.x = "a"\nweights = var.x`, {})).to.throw("Text can't be used");
      expect(() => ParserTestUtils_run(`var.x = "a"\nr[var.x]`, {})).to.throw("Text can't be used as an index");
      expect(state).to.eql({ foo: 0 });
    });

    it("rejects text passed to number functions", () => {
      expect(() => ParserTestUtils_run(`state.foo = floor("a")`, { foo: 0 })).to.throw(
        "Argument 1 (value) of 'floor' should be a number, weight or percentage, but '\"a\"' is a string"
      );
    });

    it("prints text and keeps print's return value", () => {
      const context: IScriptFnContext = { unit: "lb", prints: [] };
      const result = ParserTestUtils_run(
        `print("e1RM", rm1)\nprint(1, 20lb, 30%)\nprint("x")`,
        {},
        ParserTestUtils_defaultBindings,
        context
      );
      expect(result).to.eql("x");
      expect(context.prints).to.eql(["e1RM, 100lb", "1, 20lb, 30%", "x"]);
    });

    it("rejects a text result where a weight is expected", () => {
      const runner = new ScriptRunner(
        `"a"`,
        {},
        {},
        ParserTestUtils_defaultBindings,
        Progress_createScriptFunctions(Settings_build()),
        "lb",
        { unit: "lb", prints: [] },
        "planner"
      );
      expect(() => runner.execute("weight")).to.throw("Expected to get number, percentage or weight as a result");
    });

    it("exposes the exercise name", () => {
      const bindings = { ...ParserTestUtils_defaultBindings, exercise: "t1: Squat" };
      expect(ParserTestUtils_run(`exercise == "t1: Squat"`, {}, bindings)).to.eql(true);
      expect(ParserTestUtils_run(`exercise + "!"`, {}, bindings)).to.eql("t1: Squat!");
    });

    it("matches the exercise with isProgramExercise and isExercise", () => {
      const context: IScriptFnContext = {
        unit: "lb",
        prints: [],
        entryExercise: { id: "squat", equipment: "barbell" },
        programExerciseKey: PlannerKey_fromExerciseType({ id: "squat", equipment: "barbell" }, "t1"),
      };
      const run = (script: string): ILiftoscriptScalar =>
        ParserTestUtils_run(script, {}, ParserTestUtils_defaultBindings, context);
      expect(run(`isProgramExercise("t1: Squat")`)).to.eql(true);
      expect(run(`isProgramExercise("Squat")`)).to.eql(false);
      expect(run(`isExercise("Squat")`)).to.eql(true);
      expect(run(`isExercise("Bench Press")`)).to.eql(false);
    });

    it("returns false from isExercise without an exercise in the context", () => {
      expect(ParserTestUtils_run(`isExercise("Squat")`, {})).to.eql(false);
      expect(ParserTestUtils_run(`isProgramExercise("Squat")`, {})).to.eql(false);
    });

    it("does not treat built-in JavaScript object names as functions or variables", () => {
      expect(() => ParserTestUtils_run(`rm1 = constructor("heavy")`, {})).to.throw("Unknown function 'constructor'");
      expect(() => ParserTestUtils_run(`state.foo = toString(1)`, { foo: 0 })).to.throw("Unknown function 'toString'");
      expect(() => ParserTestUtils_run(`state.foo = constructor`, { foo: 0 })).to.throw(
        "constructor is not a valid variable"
      );
    });

    it("returns 0 from print with nothing to print", () => {
      expect(ParserTestUtils_run(`print()`, {})).to.eql(0);
      expect(ParserTestUtils_run(`"v: " + print()`, {})).to.eql("v: 0");
    });

    it("parses text that looks like code", () => {
      expect(ParserTestUtils_run(`"state.foo // { if"`, {})).to.eql("state.foo // { if");
    });
  });

  // it("precedence", () => {
  //   const program = `
  //   if (2 + 4 * 5 / 6 > state.foo ? 8 >= r[1] * 2 : 4 != 4) {
  //     state.foo = state.foo + 1
  //   }
  //   `;
  //   const state = { foo: 3 };
  //   ParserTestUtils.run(
  //     program,
  //     state,
  //     ParserTestUtils.bdgs({
  //       results: [[4, 5, 150]],
  //     })
  //   );
  //   expect(state).to.eql({ foo: 4 });
  // });
});
