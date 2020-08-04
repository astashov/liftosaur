import { ScriptRunner } from "./parser";
import { Progress, IScriptBindings } from "./models/progress";
import { Weight } from "./models/weight";

const program = `
if (day == 9) {
  state.squatTM = state.squatTM + 10
  state.benchPressTM = state.benchPressTM + 5
  state.deadliftTM = state.deadliftTM + 10
  state.overheadPressTM = state.overheadPressTM + 5
  if (state.cycle == 3) {
    state.nextDay = 10
    state.cycle = 1
  } else {
    state.nextDay = 1
    state.cycle = state.cycle + 1
  }
}
if (day == 10 && cr[1][4] < r[1][4]) {
  state.squatTM = calculateTrainingMax(w[1][4], cr[1][4])
}
if (day == 11 && cr[1][4] < r[1][4]) {
  state.overheadPressTM = calculateTrainingMax(w[1][4], cr[1][4])
}
if (day == 12 && cr[1][4] < r[1][4]) {
  state.deadliftTM = calculateTrainingMax(w[1][4], cr[1][4])
}
if (day == 13 && cr[1][4] < r[1][4]) {
  state.benchPressTM = calculateTrainingMax(w[1][4], cr[1][4])
}
`;

const bindings: IScriptBindings = {
  day: 1,
  weights: [
    [
      { value: 40, unit: "lb" },
      { value: 40, unit: "lb" },
      { value: 40, unit: "lb" },
    ],
    [
      { value: 30, unit: "lb" },
      { value: 30, unit: "lb" },
      { value: 30, unit: "lb" },
    ],
    [
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
    ],
    [
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
    ],
    [
      { value: 0, unit: "lb" },
      { value: 0, unit: "lb" },
      { value: 0, unit: "lb" },
    ],
  ],
  reps: [
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
  ],
  completedReps: [
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
  ],
  w: [
    [
      { value: 40, unit: "lb" },
      { value: 40, unit: "lb" },
      { value: 40, unit: "lb" },
    ],
    [
      { value: 30, unit: "lb" },
      { value: 30, unit: "lb" },
      { value: 30, unit: "lb" },
    ],
    [
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
    ],
    [
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
      { value: 50, unit: "lb" },
    ],
    [
      { value: 0, unit: "lb" },
      { value: 0, unit: "lb" },
      { value: 0, unit: "lb" },
    ],
  ],
  r: [
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
  ],
  cr: [
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
    [12, 12, 12],
  ],
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

const state = {
  dbBenchPressWeight: 40,
  dbBenchPressFailures: 0,
  dbBenchPressLastReps: 0,
  dbInclineFlyWeight: 30,
  dbInclineFlyFailures: 0,
  dbInclineFlyLastReps: 0,
  dbArnoldPressWeight: 50,
  dbArnoldPressFailures: 0,
  dbArnoldPressLastReps: 0,
  dbTricepsExtensionWeight: 50,
  dbTricepsExtensionFailures: 0,
  dbTricepsExtensionLastReps: 0,
  dbRowWeight: 50,
  dbRowFailures: 0,
  dbRowLastReps: 0,
  dbLateralRaiseWeight: 20,
  dbLateralRaiseFailures: 0,
  dbLateralRaiseLastReps: 0,
  dbShrugWeight: 50,
  dbShrugFailures: 0,
  dbShrugLastReps: 0,
  dbBicepCurlWeight: 20,
  dbBicepCurlFailures: 0,
  dbBicepCurlLastReps: 0,
  dbGobletSquatWeight: 40,
  dbGobletSquatFailures: 0,
  dbGobletSquatLastReps: 0,
  dbLungeWeight: 20,
  dbLungeFailures: 0,
  dbLungeLastReps: 0,
  dbSingleLegDeadliftWeight: 30,
  dbSingleLegDeadliftFailures: 0,
  dbSingleLegDeadliftLastReps: 0,
  dbCalfRaiseWeight: 50,
  dbCalfRaiseFailures: 0,
  dbCalfRaiseLastReps: 0,
};

const scriptRunner = new ScriptRunner(program, state, bindings, fns, "lb");
console.log(scriptRunner.execute());
console.log(state);
