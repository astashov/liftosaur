import "mocha";
import { expect } from "chai";
import { ScriptRunner } from "../src/parser";
import { Progress_createEmptyScriptBindings, Progress_createScriptFunctions } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { IProgramState } from "../src/types";
import { LiftoscriptSyntaxError } from "../src/liftoscriptEvaluator";
import { IProgramMode } from "../src/models/program";

const settings = Settings_build();
const dayData = { week: 1, dayInWeek: 1, day: 1 };

function run(script: string, state: IProgramState, mode: IProgramMode = "planner"): number {
  const runner = new ScriptRunner(
    script,
    state,
    {},
    Progress_createEmptyScriptBindings(dayData, settings),
    Progress_createScriptFunctions(settings),
    settings.units,
    { unit: settings.units, prints: [] },
    mode
  );
  return runner.execute("reps");
}

describe("ScriptRunner with a shared parse per script", () => {
  it("evaluates the same script against each run's own state", () => {
    const script = "state.reps + 2";
    expect(run(script, { reps: 3 })).to.equal(5);
    expect(run(script, { reps: 10 })).to.equal(12);
    expect(run(script, { reps: 3 })).to.equal(5);
  });

  it("still reports a syntax error on every run of a broken script", () => {
    const script = "state.reps +";
    expect(() => run(script, { reps: 1 })).to.throw(LiftoscriptSyntaxError);
    expect(() => run(script, { reps: 1 })).to.throw(LiftoscriptSyntaxError);
  });

  it("still reports an unknown state variable on every run", () => {
    const script = "state.missing + 1";
    expect(() => run(script, { reps: 1 })).to.throw(LiftoscriptSyntaxError);
    expect(() => run(script, { reps: 1 })).to.throw(LiftoscriptSyntaxError);
  });

  it("checks a script again when it runs against a state without the variable it once passed with", () => {
    const script = "if (0) { state.extra = 1 }\n1";
    expect(run(script, { extra: 4 })).to.equal(1);
    expect(() => run(script, { reps: 1 })).to.throw(LiftoscriptSyntaxError, "There's no state variable 'extra'");
  });

  it("checks a script again when it first passed only through a key the state inherited", () => {
    const script = "if (0) { state.value = 1 }\n1";
    const inherited: IProgramState = Object.create({ value: 2 });
    expect(run(script, inherited)).to.equal(1);
    expect(() => run(script, {})).to.throw(LiftoscriptSyntaxError, "There's no state variable 'value'");
  });

  it("checks a script again in a mode with stricter rules than the one it once passed in", () => {
    const script = "if (0) { rm1 = 100lb }\n1";
    expect(run(script, {}, "planner")).to.equal(1);
    expect(() => run(script, {}, "update")).to.throw(LiftoscriptSyntaxError, "Cannot assign to 'rm1'");
  });
});
