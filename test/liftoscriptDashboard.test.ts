import "mocha";
import { expect } from "chai";
import { ScriptRunner } from "../src/parser";
import { ILiftoscriptDashboardBindings, ILiftoscriptEnvironment } from "../src/liftoscriptEnvironment";
import {
  LiftographEnvironment_exercise,
  LiftographEnvironment_workout,
} from "../src/liftograph/liftographEnvironments";
import { ILiftographRawPoint, LiftographScriptFns_create } from "../src/liftograph/liftographScriptFns";
import { Progress_createEmptyScriptBindings, Progress_createScriptFunctions } from "../src/models/progress";
import { IProgramState } from "../src/types";
import { fxSettings } from "./liftographFixtures";

const settings = fxSettings();

const baseBindings: ILiftoscriptDashboardBindings = {
  weights: [{ value: 100, unit: "lb" }],
  completedWeights: [{ value: 100, unit: "lb" }, undefined],
  e1rm: [{ value: 116.5, unit: "lb" }, undefined],
  reps: [5, 5],
  minReps: [5, 5],
  completedReps: [5, undefined],
  RPE: [undefined, undefined],
  completedRPE: [undefined, undefined],
  numberOfSets: 2,
  completedNumberOfSets: 1,
  day: 1,
  week: 1,
  dayInWeek: 1,
  volume: { value: 500, unit: "lb" },
  bodyweight: undefined,
  exercise: "Squat",
  rm1: undefined,
};

function run(
  script: string,
  overrides: ILiftoscriptDashboardBindings = {},
  state: IProgramState = {},
  environment: ILiftoscriptEnvironment = LiftographEnvironment_exercise
): { points: ILiftographRawPoint[]; state: IProgramState } {
  const fns = LiftographScriptFns_create(settings);
  new ScriptRunner(
    script,
    state,
    {},
    { kind: "dashboard", environment, bindings: { ...baseBindings, ...overrides }, fns: fns.fns },
    "lb",
    { unit: "lb", prints: [] }
  ).execute();
  return { points: fns.takePoints(), state };
}

function runProgress(script: string): void {
  new ScriptRunner(
    script,
    {},
    {},
    {
      kind: "progress",
      mode: "planner",
      bindings: Progress_createEmptyScriptBindings({ day: 1, week: 1, dayInWeek: 1 }, settings),
      fns: Progress_createScriptFunctions(settings),
    },
    "lb",
    { unit: "lb", prints: [] }
  ).execute();
}

describe("Liftoscript in a dashboard environment", () => {
  describe("gaps", () => {
    it("keeps a gap in a var, and point() skips it while later points still count", () => {
      const { points } = run("var.bw = bodyweight\npoint(max(e1rm) / var.bw)\npoint(1)");
      expect(points).to.deep.equal([{ y: 1 }]);
    });

    it("treats a comparison with a gap as false", () => {
      const { points } = run("if (bodyweight > 0) { point(1) } else { point(2) }");
      expect(points).to.deep.equal([{ y: 2 }]);
    });

    it("treats an array comparison with a gap as false", () => {
      expect(run("if (completedRPE < 8) { point(1) }").points).to.deep.equal([]);
      expect(run("if (completedRPE == 0) { point(1) }").points).to.deep.equal([]);
      expect(run("if (completedReps >= 5) { point(1) }").points).to.deep.equal([]);
    });

    it("reports an error thrown inside a function at its call", () => {
      const script = 'point(muscleSets("chest"))\npoint(isSetExercise(1, "Squat") ? 1 : 0)';
      expect(() => run(script, {}, {}, LiftographEnvironment_workout)).to.throw("Set 1 is out of range");
      expect(() => run(script, {}, {}, LiftographEnvironment_workout)).to.throw("(2:");
    });

    it("reads a missing array element as a gap", () => {
      expect(run("point(completedWeights[2])").points).to.deep.equal([]);
      expect(run("point(completedWeights[1])").points).to.deep.equal([{ y: { value: 100, unit: "lb" } }]);
    });

    it("skips gaps in aggregates, and max of only gaps is a gap", () => {
      expect(run("point(max(completedReps))").points).to.deep.equal([{ y: 5 }]);
      expect(run("point(max(completedRPE))").points).to.deep.equal([]);
      expect(run("point(sum(completedRPE))").points).to.deep.equal([{ y: 0 }]);
      expect(run("point(count(completedReps))").points).to.deep.equal([{ y: 1 }]);
    });

    it("leaves a state variable unchanged when assigned a gap", () => {
      const { state } = run("state.first = bodyweight\nstate.total += bodyweight", {}, { first: 7, total: 3 });
      expect(state).to.deep.equal({ first: 7, total: 3 });
    });

    it("returns a gap from other functions given a gap", () => {
      expect(run("point(round(bodyweight))").points).to.deep.equal([]);
    });
  });

  describe("writes", () => {
    it("rejects writes to bindings, rm1 and other exercises' state", () => {
      expect(() => run("rm1 = 5lb")).to.throw("Cannot assign to 'rm1'");
      expect(() => run("completedReps[1] = 5")).to.throw("Cannot assign to 'completedReps[1]'");
      expect(() => run("state[1].x = 1")).to.throw("Cannot assign");
    });

    it("allows var and state writes", () => {
      const { state, points } = run("var.x = 2\nstate.total += var.x\npoint(state.total)", {}, { total: 1 });
      expect(state.total).to.equal(3);
      expect(points).to.deep.equal([{ y: 3 }]);
    });
  });

  describe("units", () => {
    it("rejects percentage literals", () => {
      expect(() => run("var.x = 50%\npoint(1)")).to.throw("Percentages can't be used in graph scripts");
    });

    it("divides weight by weight into a plain number, in both operator forms", () => {
      expect(run("point(100lb / 80lb)").points).to.deep.equal([{ y: 1.25 }]);
      const { state } = run("state.r = 100lb\nstate.r /= 80lb", {}, { r: 0 });
      expect(state.r).to.equal(1.25);
    });

    it("keeps weight plus a plain number a weight", () => {
      const { state } = run("state.total += volume", {}, { total: 0 });
      expect(state.total).to.deep.equal({ value: 500, unit: "lb" });
    });
  });

  describe("environments", () => {
    it("reports dashboard functions as unknown in progress scripts, even after a dashboard run", () => {
      run("point(1)");
      expect(() => runProgress("point(1)")).to.throw("Unknown function 'point'");
    });

    it("indexes the dashboard's own arrays", () => {
      expect(run("point(e1rm[1])").points).to.deep.equal([{ y: { value: 116.5, unit: "lb" } }]);
    });

    it("stops a loop that runs past the step budget", () => {
      const budget: ILiftoscriptEnvironment = {
        ...LiftographEnvironment_exercise,
        id: "test-budget",
        loopStepBudget: 3,
      };
      const reps = [1, 2, 3, 4];
      expect(() => run("for (var.i in completedReps) { point(1) }", { completedReps: reps }, {}, budget)).to.throw(
        "too many loop steps"
      );
      expect(
        run("for (var.i in completedReps) { point(1) }", { completedReps: [1, 2, 3] }, {}, budget).points.length
      ).to.equal(3);
    });
  });
});
