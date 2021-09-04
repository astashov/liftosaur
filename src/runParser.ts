import "./models/state";
import { ScriptRunner } from "./parser";
import { Weight } from "./models/weight";
import { Progress, IScriptBindings } from "./models/progress";

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
};

const fns = Progress.createScriptFunctions({
  plates: [
    { weight: Weight.build(45, "lb"), num: 4 },
    { weight: Weight.build(25, "lb"), num: 4 },
    { weight: Weight.build(10, "lb"), num: 4 },
    { weight: Weight.build(5, "lb"), num: 4 },
    { weight: Weight.build(2.5, "lb"), num: 4 },
    { weight: Weight.build(1.25, "lb"), num: 2 },
    { weight: Weight.build(20, "kg"), num: 4 },
    { weight: Weight.build(10, "kg"), num: 4 },
    { weight: Weight.build(5, "kg"), num: 4 },
    { weight: Weight.build(2.5, "kg"), num: 4 },
    { weight: Weight.build(1.25, "kg"), num: 4 },
    { weight: Weight.build(0.5, "kg"), num: 2 },
  ],
  lengthUnits: "in",
  statsEnabled: { weight: { weight: true }, length: {} },
  graphs: [],
  exercises: {},
  shouldShowFriendsHistory: true,
  bars: {
    lb: {
      barbell: Weight.build(45, "lb"),
      ezbar: Weight.build(20, "lb"),
      dumbbell: Weight.build(10, "lb"),
    },
    kg: {
      barbell: Weight.build(20, "kg"),
      ezbar: Weight.build(10, "kg"),
      dumbbell: Weight.build(5, "kg"),
    },
  },
  timers: {
    warmup: 90,
    workout: 180,
  },
  units: "lb",
});

const state = {};

const scriptRunner = new ScriptRunner(program, state, bindings, fns, "lb", {});
console.log(scriptRunner.execute());
console.log(state);
