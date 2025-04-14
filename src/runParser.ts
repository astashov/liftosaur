import "./models/state";
import { ScriptRunner } from "./parser";
import { Progress, IScriptBindings } from "./models/progress";
import { Settings } from "./models/settings";
import { Weight } from "./models/weight";

const program = `r[state.foo]`;

const bindings: IScriptBindings = {
  day: 1,
  week: 1,
  dayInWeek: 1,
  originalWeights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  weights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  completedWeights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  reps: [1, 2, 3],
  minReps: [1, 2, 3],
  amraps: [0, 0, 0],
  logrpes: [0, 0, 0],
  RPE: [0, 0, 0],
  timers: [0, 0, 0],
  completedRPE: [0, 0, 0],
  completedReps: [1, 2, 3],
  isCompleted: [1, 1, 1],
  w: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  cw: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  r: [1, 2, 3],
  cr: [1, 2, 3],
  mr: [1, 2, 3],
  ns: 3,
  programNumberOfSets: 3,
  numberOfSets: 3,
  completedNumberOfSets: 3,
  setIndex: 1,
  setVariationIndex: 1,
  descriptionIndex: 1,
  rm1: Weight.build(100, "lb"),
};

const fns = Progress.createScriptFunctions(Settings.build());

const state = { foo: 2 };

const scriptRunner = new ScriptRunner(program, state, {}, bindings, fns, "lb", { unit: "lb", prints: [] }, "planner");
console.log("\n\nRunning...\n\n");
const result = scriptRunner.execute();
console.log("\n\nResult:\n\n");
console.log(result);
console.log(state);
