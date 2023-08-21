import "./models/state";
import { ScriptRunner } from "./parser";
import { Progress, IScriptBindings } from "./models/progress";
import { Settings } from "./models/settings";

const program = `r[state.foo]`;

const bindings: IScriptBindings = {
  day: 1,
  week: 1,
  dayInWeek: 1,
  weights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  reps: [1, 2, 3],
  RPE: [0, 0, 0],
  completedRPE: [0, 0, 0],
  completedReps: [1, 2, 3],
  w: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  r: [1, 2, 3],
  cr: [1, 2, 3],
  ns: 3,
  numberOfSets: 3,
  setIndex: 1,
};

const fns = Progress.createScriptFunctions(Settings.build());

const state = { foo: 2 };

const scriptRunner = new ScriptRunner(program, state, bindings, fns, "lb", {});
console.log("\n\nRunning...\n\n");
const result = scriptRunner.execute();
console.log("\n\nResult:\n\n");
console.log(result);
console.log(state);
