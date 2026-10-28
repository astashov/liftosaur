import type { IPercentage, IWeight } from "./types";
import type { IProgramMode } from "./models/program";
import type { IProgressScriptFunctions, IScriptBindings, IScriptFunctionTable } from "./liftoscriptFns";
import {
  IScriptFnName,
  IScriptStaticType,
  LiftoscriptFns_staticTypesOf,
  liftographFnNames,
  liftoscriptFnSignatures,
  VScriptBindings,
} from "./liftoscriptFns";

export interface ILiftoscriptEnvironment {
  readonly id: string;
  readonly fnNames: ReadonlySet<IScriptFnName>;
  readonly indexableBindings: ReadonlySet<string>;
  readonly bindingTypes: Readonly<Record<string, IScriptStaticType>>;
  readonly loopStepBudget?: number;
}

export type ILiftoscriptBindingValue =
  | number
  | string
  | IWeight
  | IPercentage
  | (number | IWeight | IPercentage | undefined)[];

export type ILiftoscriptDashboardBindings = { readonly [name: string]: ILiftoscriptBindingValue | undefined };

export type ILiftoscriptExecution =
  | { kind: "progress"; mode: IProgramMode; bindings: IScriptBindings; fns: IProgressScriptFunctions }
  | {
      kind: "dashboard";
      environment: ILiftoscriptEnvironment;
      bindings: ILiftoscriptDashboardBindings;
      fns: IScriptFunctionTable;
    };

export function LiftoscriptEnvironment_of(execution: ILiftoscriptExecution): ILiftoscriptEnvironment {
  return execution.kind === "progress" ? LiftoscriptEnvironment_progress : execution.environment;
}

const liftographFnNameSet: ReadonlySet<string> = new Set(liftographFnNames);

export const LiftoscriptEnvironment_progress: ILiftoscriptEnvironment = {
  id: "progress",
  fnNames: new Set(
    (Object.keys(liftoscriptFnSignatures) as IScriptFnName[]).filter((name) => !liftographFnNameSet.has(name))
  ),
  indexableBindings: new Set([
    "originalWeights",
    "weights",
    "reps",
    "minReps",
    "completedReps",
    "completedRepsLeft",
    "completedWeights",
    "timers",
    "setTime",
    "completedSetTime",
    "completedSetTimeLeft",
    "w",
    "r",
    "cr",
    "cw",
    "mr",
    "completedRPE",
    "bodyweight",
    "RPE",
    "setVariationIndex",
    "exerciseVariationIndex",
    "descriptionIndex",
    "numberOfSets",
    "programNumberOfSets",
    "completedNumberOfSets",
    "amraps",
    "logrpes",
    "askweights",
  ]),
  bindingTypes: LiftoscriptFns_staticTypesOf(VScriptBindings.entries),
};
