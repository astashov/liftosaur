import "./models/state";
import { ScriptRunner } from "./parser";
import { Progress, IScriptBindings } from "./models/progress";
import { Settings } from "./models/settings";

const program = `
  // a program
  if (!(completedReps >= reps) && 3 == 5) {
    // some comments
    1
  } else {
    2
  }
`;

const bindings: IScriptBindings = {
  day: 1,
  weights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  reps: [12, 12, 12],
  completedReps: [12, 12, 12],
  w: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  r: [12, 12, 12],
  cr: [12, 12, 12],
  ns: 3,
  numberOfSets: 3,
};

const fns = Progress.createScriptFunctions(Settings.build());

const state = {};

const scriptRunner = new ScriptRunner(program, state, bindings, fns, "lb", {});
console.log(scriptRunner.execute());
console.log(state);
