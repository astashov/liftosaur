import * as v from "valibot";
import { IEither } from "../../src/utils/types";
import { IApiError } from "./apiv1";
import { IWeight, ISettings, IGym } from "../../src/types";
import { Weight_strictParse } from "../../src/models/weight";
import { MathUtils_roundFloat, MathUtils_clamp } from "../../src/utils/math";

// Shared building blocks for the /api/v1 resource handlers (apiv1Equipment.ts, apiv1ExerciseData.ts, ...).

export type IApiResult<T> = IEither<T, IApiError>;

export function err<T>(status: number, code: string, message: string, details?: IApiError["details"]): IApiResult<T> {
  return { success: false, error: { status, code, message, details } };
}

export function ok<T>(data: T): IApiResult<T> {
  return { success: true, data };
}

export const MAX_WEIGHT = 5000;
export const MAX_NOTES_LENGTH = 2500;

// Parses a weight string like "45lb"/"20kg", rejects anything else (instead of coercing to 0), and clamps
// the value to a sane range. Callers that need a unit constraint pipe this through an extra v.check.
export const VWeightString = v.pipe(
  v.string(),
  v.transform((s) => Weight_strictParse(s.trim())),
  v.check((w): w is IWeight => w != null, 'Invalid weight, expected a string like "45lb" or "20kg"'),
  v.transform((w) => {
    const weight = w as IWeight;
    return {
      value: MathUtils_roundFloat(MathUtils_clamp(weight.value, 0, MAX_WEIGHT), 3),
      unit: weight.unit,
    } as IWeight;
  })
);

// Flattens valibot issues into a single human-readable message, prefixing each with its dotted path.
export function issuesToMessage(issues: v.GenericIssue[]): string {
  return (
    issues
      .map((i) => {
        const path = (i.path ?? [])
          .map((p) => (typeof (p as { key?: unknown }).key === "string" ? (p as { key: string }).key : ""))
          .filter(Boolean)
          .join(".");
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join("; ") || "Invalid input"
  );
}

// Compile-time exactness check used by the field-policy drift guards: resolves to `true` only when A and B
// are the same union, otherwise `false` (so an assignment of `true` to it fails to compile).
export type IExactUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export function getGym(settings: ISettings, gymId: string): IGym | undefined {
  return settings.gyms.find((g) => g.id === gymId);
}
