import { ScriptRunner } from "./parser";
import { Progress } from "./models/progress";

const program = `
if (day == 1) {
  if (cr[1][1] + cr[1][2] + cr[1][3] >= 15) {
    state.barbellRows = state.barbellRows + (cr[1][3] > 10 ? 5 : 2.5)
  } else {
    state.barbellRows = roundWeight(state.barbellRows * 0.9)
  }
  if (cr[2][1] + cr[2][2] + cr[2][3] >= 15) {
    state.benchPress = state.benchPress + (cr[2][3] > 10 ? 5 : 2.5)
  } else {
    state.benchPress = roundWeight(state.benchPress * 0.9)
  }
  if (cr[3][1] + cr[3][2] + cr[3][3] >= 15) {
    state.squat = state.squat + (cr[3][3] > 10 ? 10 : 5)
  } else {
    state.squat = roundWeight(state.squat * 0.9)
  }
} else {
  if (cr[2][1] + cr[2][2] + cr[2][3] >= 15) {
    state.overheadPress = state.overheadPress + (cr[2][3] > 10 ? 5 : 2.5)
  } else {
    state.overheadPress = roundWeight(state.overheadPress * 0.9)
  }
  if (cr[3][1] + cr[3][2] + cr[3][3] >= 15) {
    state.deadlift = state.deadlift + (cr[3][3] > 10 ? 10 : 5)
  } else {
    state.deadlift = roundWeight(state.deadlift * 0.9)
  }
}
`;

const bindings = {
  day: 1,
  weights: [
    [97.5, 97.5, 97.5],
    [47.5, 47.5, 47.5],
    [50, 50, 50],
  ],
  reps: [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ],
  completedReps: [
    [5, 5, 20],
    [5, 5, 3],
    [5, 5, 5],
  ],
  w: [
    [97.5, 97.5, 97.5],
    [47.5, 47.5, 47.5],
    [50, 50, 50],
  ],
  r: [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ],
  cr: [
    [5, 5, 20],
    [5, 5, 3],
    [5, 5, 5],
  ],
};

const fns = Progress.createScriptFunctions({
  plates: [
    { weight: 45, num: 4 },
    { weight: 25, num: 4 },
    { weight: 10, num: 4 },
    { weight: 5, num: 4 },
    { weight: 2.5, num: 4 },
    { weight: 1.25, num: 2 },
  ],
  bars: {
    barbell: 45,
    ezbar: 20,
    dumbbell: 10,
  },
  timers: {
    warmup: 90,
    workout: 180,
  },
});

const state = {
  barbellRows: 97.5,
  benchPress: 45,
  overheadPress: 45,
  deadlift: 95,
  squat: 45,
  chinups: 0,
};

const scriptRunner = new ScriptRunner(program, state, bindings, fns);
console.log(scriptRunner.execute());
console.log(state);
