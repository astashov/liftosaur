/* eslint-disable no-bitwise */
import { StringUtils_hashCode } from "./utils/string";

export interface ILiftoscriptRandomState {
  seed: number;
  calls: number;
}

export type ILiftoscriptRandomRun = { kind: "finish" } | { kind: "update"; setIndex: number };

function mix32(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function LiftoscriptRandom_seed(
  startTime: number,
  programExerciseKey: string,
  run: ILiftoscriptRandomRun
): number {
  const runKey = run.kind === "update" ? `update:${run.setIndex}` : "finish";
  return StringUtils_hashCode([startTime, programExerciseKey, runKey].join("|")) >>> 0;
}

export function LiftoscriptRandom_init(seed: number): ILiftoscriptRandomState {
  return { seed: seed >>> 0, calls: 0 };
}

export function LiftoscriptRandom_int(state: ILiftoscriptRandomState, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const n = mix32(state.seed ^ mix32(state.calls + 0x9e3779b9));
  state.calls += 1;
  return lo + (n % (hi - lo + 1));
}
