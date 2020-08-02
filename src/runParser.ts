import { ScriptRunner } from "./parser";
import { Progress } from "./models/progress";

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

const bindings = {
  day: 1,
  weights: [
    [40, 40, 40],
    [30, 30, 30],
    [50, 50, 50],
    [50, 50, 50],
    [0, 0, 0],
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
    [40, 40, 40],
    [30, 30, 30],
    [50, 50, 50],
    [50, 50, 50],
    [0, 0, 0],
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
  plates: {
    lb: [
      { weight: 45, num: 4 },
      { weight: 25, num: 4 },
      { weight: 10, num: 4 },
      { weight: 5, num: 4 },
      { weight: 2.5, num: 4 },
      { weight: 1.25, num: 2 },
    ],
    kg: [
      { weight: 20, num: 4 },
      { weight: 10, num: 4 },
      { weight: 5, num: 4 },
      { weight: 2.5, num: 4 },
      { weight: 1.25, num: 4 },
      { weight: 0.5, num: 2 },
    ],
  },
  bars: {
    lb: {
      barbell: 45,
      ezbar: 20,
      dumbbell: 10,
    },
    kg: {
      barbell: 20,
      ezbar: 10,
      dumbbell: 5,
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

const scriptRunner = new ScriptRunner(program, state, bindings, fns);
console.log(scriptRunner.execute(false));
console.log(state);
