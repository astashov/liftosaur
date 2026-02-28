import { IScriptBindings, Progress_createScriptFunctions } from "../models/progress";
import { Settings_build } from "../models/settings";
import { Weight_build } from "../models/weight";
import { ScriptRunner } from "../parser";
import { IProgramState, IWeight, IUnit } from "../types";

export function ParserTestUtils_bdgs(args: {
  day?: number;
  results: [number, number, number][];
  unit?: IUnit;
}): IScriptBindings {
  const reps = args.results.map((r) => r[0]);
  const completedReps = args.results.map((r) => r[1]);
  const weights = args.results.map((r) => Weight_build(r[2], args.unit || "lb"));
  return {
    day: args.day ?? 1,
    week: 1,
    dayInWeek: args.day ?? 1,
    originalWeights: weights,
    weights,
    completedWeights: weights,
    isCompleted: completedReps.map((r) => (r ? 1 : 0)),
    reps,
    minReps: reps,
    RPE: reps.map(() => 0),
    completedRepsLeft: reps.map(() => 0),
    completedRPE: reps.map(() => 0),
    amraps: reps.map(() => 0),
    logrpes: reps.map(() => 0),
    askweights: reps.map(() => 0),
    timers: reps.map(() => 0),
    completedReps,
    w: weights,
    r: reps,
    cr: completedReps,
    cw: weights,
    mr: reps,
    ns: args.results.length,
    programNumberOfSets: args.results.length,
    numberOfSets: args.results.length,
    completedNumberOfSets: completedReps.filter((cr) => cr != null).length,
    setIndex: 1,
    setVariationIndex: 1,
    descriptionIndex: 1,
    bodyweight: Weight_build(0, "lb"),
    rm1: Weight_build(100, "lb"),
  };
}

export function ParserTestUtils_run(
  program: string,
  state: IProgramState,
  bindings: IScriptBindings = ParserTestUtils_defaultBindings
): number | IWeight | boolean {
  const scriptRunner = new ScriptRunner(program, state, {}, bindings, fns, "lb", { unit: "lb", prints: [] }, "planner");
  return scriptRunner.execute();
}

const fns = Progress_createScriptFunctions(Settings_build());

export const ParserTestUtils_defaultBindings: IScriptBindings = {
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
  isCompleted: [1, 1, 1],
  reps: [1, 2, 3],
  minReps: [1, 2, 3],
  RPE: [0, 0, 0],
  amraps: [0, 0, 0],
  logrpes: [0, 0, 0],
  askweights: [0, 0, 0],
  timers: [0, 0, 0],
  completedReps: [1, 2, 3],
  completedRepsLeft: [0, 0, 0],
  completedRPE: [0, 0, 0],
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
  bodyweight: Weight_build(0, "lb"),
  descriptionIndex: 1,
  rm1: Weight_build(100, "lb"),
};
