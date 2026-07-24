import * as v from "valibot";
import { VWeight, VPercentage } from "./types";
import type { IScriptFnContext } from "./models/progress";

const optionalNumbers = v.array(v.optional(v.number()));
const optionalWeights = v.array(v.optional(VWeight));

export const VScriptBindings = v.object({
  day: v.number(),
  week: v.number(),
  dayInWeek: v.number(),
  originalWeights: v.array(v.union([VWeight, VPercentage])),
  weights: optionalWeights,
  completedWeights: optionalWeights,
  rm1: VWeight,
  reps: optionalNumbers,
  minReps: optionalNumbers,
  amraps: optionalNumbers,
  askweights: optionalNumbers,
  logrpes: optionalNumbers,
  timers: optionalNumbers,
  setTime: optionalNumbers,
  completedSetTime: optionalNumbers,
  RPE: optionalNumbers,
  completedRPE: optionalNumbers,
  completedReps: optionalNumbers,
  completedRepsLeft: optionalNumbers,
  isCompleted: v.array(v.picklist([0, 1])),
  w: optionalWeights,
  r: optionalNumbers,
  mr: optionalNumbers,
  cr: optionalNumbers,
  cw: optionalWeights,
  ns: v.number(),
  programNumberOfSets: v.number(),
  numberOfSets: v.number(),
  completedNumberOfSets: v.number(),
  setVariationIndex: v.number(),
  exerciseVariationIndex: v.number(),
  bodyweight: VWeight,
  descriptionIndex: v.number(),
  setIndex: v.number(),
});

export type IScriptBindings = v.InferOutput<typeof VScriptBindings>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IAnySchema = v.GenericSchema<any, any>;

export interface IScriptFnArgSignature {
  readonly name: string;
  readonly schema: IAnySchema;
  readonly hint: string;
  readonly optional?: boolean;
}

export interface IScriptFnSignature {
  readonly args?: readonly IScriptFnArgSignature[];
  readonly variadic?: { readonly schema: IAnySchema; readonly hint: string };
  readonly returns: IAnySchema;
}

const scalar = v.union([v.number(), VWeight, VPercentage]);
const numberOrWeight = v.union([v.number(), VWeight]);
const numberOrWeightArray = v.array(v.nullish(numberOrWeight));
// Booleans are allowed in aggregate fns because they historically were silently
// ignored there, and erroring now would break existing user programs.
const aggregatable = v.union([scalar, v.boolean(), v.array(v.nullish(scalar))]);

export const liftoscriptFnSignatures = {
  roundWeight: {
    args: [{ name: "weight", schema: numberOrWeight, hint: "a weight or a number" }],
    returns: VWeight,
  },
  roundConvertWeight: {
    args: [{ name: "weight", schema: numberOrWeight, hint: "a weight or a number" }],
    returns: VWeight,
  },
  calculateTrainingMax: {
    args: [
      { name: "weight", schema: numberOrWeight, hint: "a weight or a number" },
      { name: "reps", schema: v.number(), hint: "a number of reps" },
    ],
    returns: VWeight,
  },
  calculate1RM: {
    args: [
      { name: "weight", schema: numberOrWeight, hint: "a weight or a number" },
      { name: "reps", schema: v.number(), hint: "a number of reps" },
    ],
    returns: VWeight,
  },
  rpeMultiplier: {
    args: [
      { name: "reps", schema: numberOrWeight, hint: "a number of reps" },
      { name: "rpe", schema: numberOrWeight, hint: "an RPE value", optional: true },
    ],
    returns: v.number(),
  },
  floor: {
    args: [{ name: "value", schema: scalar, hint: "a number, weight or percentage" }],
    returns: scalar,
  },
  ceil: {
    args: [{ name: "value", schema: scalar, hint: "a number, weight or percentage" }],
    returns: scalar,
  },
  round: {
    args: [{ name: "value", schema: scalar, hint: "a number, weight or percentage" }],
    returns: scalar,
  },
  sum: {
    variadic: { schema: aggregatable, hint: "numbers, weights, percentages or arrays of them" },
    returns: scalar,
  },
  min: {
    variadic: { schema: aggregatable, hint: "numbers, weights, percentages or arrays of them" },
    returns: scalar,
  },
  max: {
    variadic: { schema: aggregatable, hint: "numbers, weights, percentages or arrays of them" },
    returns: scalar,
  },
  zeroOrGte: {
    args: [
      { name: "values", schema: numberOrWeightArray, hint: "an array, like 'completedReps'" },
      { name: "targets", schema: numberOrWeightArray, hint: "an array, like 'reps'" },
    ],
    returns: v.boolean(),
  },
  print: {
    variadic: { schema: v.any(), hint: "any values" },
    returns: v.any(),
  },
  increment: {
    args: [{ name: "value", schema: scalar, hint: "a number, weight or percentage" }],
    returns: scalar,
  },
  decrement: {
    args: [{ name: "value", schema: scalar, hint: "a number, weight or percentage" }],
    returns: scalar,
  },
  sets: {
    args: [
      { name: "fromIndex", schema: v.number(), hint: "a number" },
      { name: "toIndex", schema: v.number(), hint: "a number" },
      { name: "minReps", schema: v.number(), hint: "a number" },
      { name: "maxReps", schema: v.number(), hint: "a number" },
      { name: "isAmrap", schema: v.number(), hint: "a number (0 or 1)" },
      { name: "weight", schema: scalar, hint: "a weight, number or percentage" },
      { name: "timer", schema: v.number(), hint: "a number of seconds" },
      { name: "rpe", schema: v.number(), hint: "a number" },
      { name: "shouldLogRpe", schema: v.number(), hint: "a number (0 or 1)" },
    ],
    returns: v.number(),
  },
} as const satisfies Record<string, IScriptFnSignature>;

export type IScriptFnName = keyof typeof liftoscriptFnSignatures;

type IArgOutput<TArg> = TArg extends { schema: infer TSchema extends IAnySchema }
  ? TArg extends { optional: true }
    ? v.InferOutput<TSchema> | undefined
    : v.InferOutput<TSchema>
  : never;

type IFnArgs<TSig> = TSig extends { args: infer TArgs extends readonly unknown[] }
  ? { -readonly [I in keyof TArgs]: IArgOutput<TArgs[I]> }
  : TSig extends { variadic: { schema: infer TSchema extends IAnySchema } }
    ? v.InferOutput<TSchema>[]
    : never;

export type IScriptFunctions = {
  [K in IScriptFnName]: (
    args: IFnArgs<(typeof liftoscriptFnSignatures)[K]>,
    context: IScriptFnContext,
    bindings: IScriptBindings
  ) => v.InferOutput<(typeof liftoscriptFnSignatures)[K]["returns"]>;
};

export function LiftoscriptFns_isFnName(name: string): name is IScriptFnName {
  return name in liftoscriptFnSignatures;
}

export function LiftoscriptFns_arity(name: IScriptFnName): { min: number; max: number | undefined } {
  const signature: IScriptFnSignature = liftoscriptFnSignatures[name];
  if (signature.args == null) {
    return { min: 0, max: undefined };
  }
  const min = signature.args.filter((a) => !a.optional).length;
  return { min, max: signature.args.length };
}

export function LiftoscriptFns_argSignature(name: IScriptFnName, index: number): IScriptFnArgSignature | undefined {
  const signature: IScriptFnSignature = liftoscriptFnSignatures[name];
  if (signature.variadic != null) {
    return { name: "values", schema: signature.variadic.schema, hint: signature.variadic.hint };
  }
  return signature.args?.[index];
}

export function LiftoscriptFns_isValidArg(name: IScriptFnName, index: number, value: unknown): boolean {
  const argSignature = LiftoscriptFns_argSignature(name, index);
  if (argSignature == null) {
    return true;
  }
  if (argSignature.optional && value == null) {
    return true;
  }
  return v.is(argSignature.schema, value);
}

export type IScriptStaticType = "number" | "weight" | "percentage" | "array";

export function LiftoscriptFns_bindingStaticType(name: string): IScriptStaticType | undefined {
  const schema = (VScriptBindings.entries as Record<string, IAnySchema | undefined>)[name];
  if (schema == null) {
    return undefined;
  }
  const samples: [IScriptStaticType, unknown][] = [
    ["array", []],
    ["number", 1],
    ["weight", { value: 1, unit: "lb" }],
    ["percentage", { value: 1, unit: "%" }],
  ];
  return samples.find(([, sample]) => v.is(schema, sample))?.[0];
}

export function LiftoscriptFns_acceptsTypeAt(name: IScriptFnName, index: number, type: IScriptStaticType): boolean {
  const samples: Record<IScriptStaticType, unknown[]> = {
    number: [1],
    weight: [{ value: 1, unit: "lb" }],
    percentage: [{ value: 1, unit: "%" }],
    array: [[1], [{ value: 1, unit: "lb" }], [{ value: 1, unit: "%" }], []],
  };
  return samples[type].some((sample) => LiftoscriptFns_isValidArg(name, index, sample));
}
