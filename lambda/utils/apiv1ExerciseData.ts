import * as v from "valibot";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import { IExerciseDataValue, ISettings, VExerciseDataValue, VMuscle } from "../../src/types";
import { Weight_print } from "../../src/models/weight";
import { Exercise_fromKey, Exercise_toKey, Exercise_find } from "../../src/models/exercise";
import { Equipment_isBuiltIn } from "../../src/models/equipment";
import { MathUtils_roundFloat, MathUtils_clamp } from "../../src/utils/math";
import {
  IApiResult,
  IExactUnion,
  VWeightString,
  MAX_NOTES_LENGTH,
  err,
  ok,
  issuesToMessage,
  getGym,
} from "./apiv1Common";

const MIN_ROUNDING = 0.1;
const MAX_ROUNDING = 1000;
const MAX_MUSCLE_MULTIPLIERS = 100;
const MIN_VOLUME_MULTIPLIER = 1;
const MAX_VOLUME_MULTIPLIER = 10;

// `null` clears the field (reverts it to the computed default); `undefined`/absent keeps the current value.
function nullable<TOutput>(schema: v.GenericSchema<unknown, TOutput>): v.GenericSchema<unknown, TOutput | null> {
  return v.nullable(schema) as v.GenericSchema<unknown, TOutput | null>;
}

const VExerciseDataUpdateInput = v.object({
  rm1: v.optional(nullable(VWeightString)),
  rounding: v.optional(
    nullable(
      v.pipe(
        v.number(),
        v.transform((n) => MathUtils_roundFloat(MathUtils_clamp(n, MIN_ROUNDING, MAX_ROUNDING), 3))
      )
    )
  ),
  // gymId -> equipmentId override, validated against the user's gyms in applyExerciseDataInput. A per-gym
  // value of null means "None" (the exercise uses no equipment at that gym) — the app stores that as
  // `undefined`. Top-level null clears all per-gym overrides.
  equipment: v.optional(nullable(v.record(v.string(), v.nullable(v.string())))),
  notes: v.optional(
    nullable(
      v.pipe(
        v.string(),
        v.transform((s) => s.slice(0, MAX_NOTES_LENGTH))
      )
    )
  ),
  // muscle name -> multiplier. 1 marks the muscle as a target, <1 marks it as a synergist with that weight.
  muscleMultipliers: v.optional(
    nullable(
      v.pipe(
        v.record(
          VMuscle,
          v.pipe(
            v.number(),
            v.transform((n) => MathUtils_roundFloat(MathUtils_clamp(n, 0, 1), 3))
          )
        ),
        v.check((r) => Object.keys(r).length <= MAX_MUSCLE_MULTIPLIERS, "Too many muscle multipliers")
      )
    )
  ),
  isUnilateral: v.optional(nullable(v.boolean())),
  // Falls back to 1 (a no-op) on non-finite input, then clamps to a sane range so a bad value
  // can't corrupt volume/total-weight totals and graphs.
  volumeMultiplier: v.optional(
    nullable(
      v.pipe(
        v.number(),
        v.transform((n) =>
          Number.isFinite(n)
            ? MathUtils_roundFloat(MathUtils_clamp(n, MIN_VOLUME_MULTIPLIER, MAX_VOLUME_MULTIPLIER), 2)
            : 1
        )
      )
    )
  ),
});

export type IExerciseDataUpdateInput = v.InferOutput<typeof VExerciseDataUpdateInput>;

// Every field of IExerciseDataValue must be classified here, so adding/removing a field to the
// interface is a compile error until its API handling is decided:
//   - "writable": settable through the API/MCP — must appear in VExerciseDataUpdateInput (enforced below)
// `as const satisfies` keeps the literal values while forcing exhaustiveness + rejecting unknown keys.
type IExerciseDataFieldPolicy = "writable";
const EXERCISE_DATA_FIELD_POLICY = {
  rm1: "writable",
  rounding: "writable",
  equipment: "writable",
  notes: "writable",
  muscleMultipliers: "writable",
  isUnilateral: "writable",
  volumeMultiplier: "writable",
} as const satisfies Record<keyof IExerciseDataValue, IExerciseDataFieldPolicy>;

export type IWritableExerciseDataField = {
  [K in keyof typeof EXERCISE_DATA_FIELD_POLICY]: (typeof EXERCISE_DATA_FIELD_POLICY)[K] extends "writable" ? K : never;
}[keyof typeof EXERCISE_DATA_FIELD_POLICY];

export const EXERCISE_DATA_WRITABLE_FIELDS = (
  Object.keys(EXERCISE_DATA_FIELD_POLICY) as (keyof IExerciseDataValue)[]
).filter((k): k is IWritableExerciseDataField => EXERCISE_DATA_FIELD_POLICY[k] === "writable");

// Forces the valibot input schema to accept exactly the "writable" fields and nothing else — if the
// policy and schema drift apart (e.g. a new writable field isn't added to VExerciseDataUpdateInput), this
// assignment fails to compile because IExactUnion resolves to `false`. Exported only so noUnusedLocals
// doesn't flag this compile-time assertion (lambda's eslint config forbids the usual `void` marker).
export const _exerciseDataInputMatchesPolicy: IExactUnion<keyof IExerciseDataUpdateInput, IWritableExerciseDataField> =
  true;

function parseExerciseDataInput(input: unknown): IApiResult<IExerciseDataUpdateInput> {
  const result = v.safeParse(VExerciseDataUpdateInput, input ?? {});
  if (!result.success) {
    return err(400, "invalid_input", issuesToMessage(result.issues));
  }
  return ok(result.output);
}

// `undefined` keeps the base value, `null` clears the field, a value sets it.
function resolve<T>(input: T | null | undefined, base: T | undefined): T | undefined {
  if (input === undefined) {
    return base;
  }
  if (input === null) {
    return undefined;
  }
  return input;
}

function isKnownEquipment(settings: ISettings, equipment: string): boolean {
  return Equipment_isBuiltIn(equipment) || settings.gyms.some((g) => g.equipment[equipment] != null);
}

// The exercise key must be one the app would actually read back, i.e. exactly Exercise_toKey(type) for a
// real exercise. Built-in ids/equipment and generated custom ids never contain "_", so we can validate by
// parsing + round-tripping — but we check exact custom-exercise ids FIRST, since legacy/imported custom ids
// can contain "_" and would otherwise be mis-split by Exercise_fromKey.
function validateExerciseKey(settings: ISettings, key: string): IApiResult<void> {
  if (settings.exercises[key] != null) {
    return ok(undefined);
  }
  const type = Exercise_fromKey(key);
  // Reject non-canonical keys: Exercise_fromKey keeps only the first two "_"-separated parts, so
  // "squat_barbell_extra" parses to "squat_barbell" — data stored under the original key would never be read.
  if (Exercise_toKey(type) !== key) {
    return err(
      400,
      "invalid_input",
      `Malformed exercise key '${key}'. Expected '<exerciseId>' or '<exerciseId>_<equipment>' (e.g. 'squat_barbell').`
    );
  }
  if (Exercise_find(type, settings.exercises) == null) {
    return err(
      400,
      "invalid_input",
      `Unknown exercise key '${key}'. Use a key like 'squat_barbell' (built-in id + optional equipment) or a custom exercise id.`
    );
  }
  if (type.equipment != null && !isKnownEquipment(settings, type.equipment)) {
    return err(
      400,
      "invalid_input",
      `Unknown equipment '${type.equipment}' in key '${key}'. Use a built-in equipment (e.g. 'barbell') or a custom equipment id present in one of your gyms.`
    );
  }
  return ok(undefined);
}

// Resolves the per-gym equipment override. Validation only runs on an explicitly-provided record — an
// omitted field carries the base forward untouched, so a pre-existing "None" override ({gymId: undefined})
// or an entry referencing a since-deleted gym never blocks updating unrelated fields. A per-gym null/
// undefined is normalized to `undefined` ("None"), matching how the app stores it (editEquipment.ts).
function resolveEquipment(
  settings: ISettings,
  input: Record<string, string | null> | null | undefined,
  base: Record<string, string | undefined> | undefined
): IApiResult<Record<string, string | undefined> | undefined> {
  if (input === undefined) {
    return ok(base);
  }
  if (input === null) {
    return ok(undefined);
  }
  const normalized: Record<string, string> = {};
  for (const [gymId, equipmentId] of Object.entries(input)) {
    const gym = getGym(settings, gymId);
    if (!gym) {
      return err(400, "invalid_input", `equipment: unknown gym '${gymId}'`);
    }
    if (equipmentId == null) {
      // "None": omit the gym key entirely. The app reads a missing key as "no equipment", and — unlike a
      // stored `undefined` — an absent key survives DynamoDB's removeUndefinedValues, so it round-trips.
      continue;
    }
    if (gym.equipment[equipmentId] == null) {
      return err(400, "invalid_input", `equipment: unknown equipment '${equipmentId}' in gym '${gymId}'`);
    }
    normalized[gymId] = equipmentId;
  }
  return ok(normalized);
}

function applyExerciseDataInput(
  settings: ISettings,
  base: IExerciseDataValue,
  input: IExerciseDataUpdateInput
): IApiResult<IExerciseDataValue> {
  const equipmentResult = resolveEquipment(settings, input.equipment, base.equipment);
  if (!equipmentResult.success) {
    return equipmentResult;
  }

  const merged: IExerciseDataValue = {
    rm1: resolve(input.rm1, base.rm1),
    rounding: resolve(input.rounding, base.rounding),
    equipment: equipmentResult.data,
    notes: resolve(input.notes, base.notes),
    muscleMultipliers: resolve(input.muscleMultipliers, base.muscleMultipliers as Record<string, number> | undefined),
    isUnilateral: resolve(input.isUnilateral, base.isUnilateral),
    volumeMultiplier: resolve(input.volumeMultiplier, base.volumeMultiplier),
  };

  // Drop undefined keys so cleared fields don't linger as `key: undefined` in storage.
  for (const key of Object.keys(merged) as (keyof IExerciseDataValue)[]) {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  }

  // Final guard: the object that hits storage must satisfy the canonical schema.
  const validated = v.safeParse(VExerciseDataValue, merged);
  if (!validated.success) {
    return err(400, "invalid_input", issuesToMessage(validated.issues));
  }
  return ok(validated.output);
}

interface IExerciseDataResponse {
  key: string;
  exerciseName?: string;
  rm1?: string;
  rounding?: number;
  // gymId -> equipmentId, listing only gyms with a real equipment override. A gym absent from the map
  // means "None" (no equipment there) — matching how the app and DynamoDB drop "None" entries.
  equipment?: Record<string, string>;
  notes?: string;
  muscleMultipliers?: Record<string, number | undefined>;
  isUnilateral?: boolean;
  volumeMultiplier?: number;
}

function formatEquipmentOverride(
  equipment: Record<string, string | undefined> | undefined
): Record<string, string> | undefined {
  if (equipment == null) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const gymId of Object.keys(equipment)) {
    const value = equipment[gymId];
    if (value != null) {
      out[gymId] = value;
    }
  }
  return out;
}

// Mirrors validateExerciseKey: check exact custom-exercise ids FIRST so a legacy/imported custom id
// containing "_" isn't mis-parsed as "<id>_<equipment>" (which would drop exerciseName from the response).
function exerciseNameForKey(key: string, settings: ISettings): string | undefined {
  const custom = settings.exercises[key];
  if (custom != null) {
    return custom.name;
  }
  return Exercise_find(Exercise_fromKey(key), settings.exercises)?.name;
}

function formatExerciseData(key: string, d: IExerciseDataValue, settings: ISettings): IExerciseDataResponse {
  return {
    key,
    exerciseName: exerciseNameForKey(key, settings),
    rm1: d.rm1 != null ? Weight_print(d.rm1) : undefined,
    rounding: d.rounding,
    equipment: formatEquipmentOverride(d.equipment),
    notes: d.notes,
    muscleMultipliers: d.muscleMultipliers,
    isUnilateral: d.isUnilateral,
    volumeMultiplier: d.volumeMultiplier,
  };
}

export function ApiV1_listExerciseData(user: ILimitedUserDao): IApiResult<{ exerciseData: IExerciseDataResponse[] }> {
  const settings = user.storage.settings;
  const exerciseData = Object.keys(settings.exerciseData)
    .map((key) => {
      const d = settings.exerciseData[key];
      return d != null && !isEmptyExerciseData(d) ? formatExerciseData(key, d, settings) : undefined;
    })
    .filter((e): e is IExerciseDataResponse => e != null);
  return ok({ exerciseData });
}

export function ApiV1_getExerciseData(user: ILimitedUserDao, key: string): IApiResult<IExerciseDataResponse> {
  const settings = user.storage.settings;
  const d = settings.exerciseData[key];
  if (!d || isEmptyExerciseData(d)) {
    return err(404, "not_found", "Exercise data not found");
  }
  return ok(formatExerciseData(key, d, settings));
}

// An entry with no fields carries no customization — the app already treats it as "no data"
// (Equipment_getEquipmentIdForExerciseType, Exercise_onerm, etc. all fall back to defaults). We keep the
// (possibly empty) key in storage rather than deleting it, and hide empties from the API surface (list/get)
// instead. Deleting the key would write a version tombstone for a dictionary field (settings.exerciseData),
// so a later re-add would be a delete+re-add churn across devices — keeping `{}` makes the re-add a plain
// dictionary value update.
function isEmptyExerciseData(d: IExerciseDataValue): boolean {
  return Object.keys(d).length === 0;
}

async function writeExerciseData(user: ILimitedUserDao, key: string, data: IExerciseDataValue, di: IDI): Promise<void> {
  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      exerciseData: { ...old.settings.exerciseData, [key]: data },
    },
  }));
}

// Upserts exercise data (rm1, rounding, equipment overrides, etc.) for an exercise key like
// "squat_barbell" or "benchPress". Only provided fields change; pass `null` to clear a single field,
// or use deleteExerciseData to remove the whole entry.
export async function ApiV1_setExerciseData(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  input: unknown,
  di: IDI
): Promise<IApiResult<IExerciseDataResponse>> {
  const settings = user.storage.settings;
  const trimmedKey = (key ?? "").trim();
  if (!trimmedKey) {
    return err(400, "invalid_input", "Exercise key is required");
  }
  const keyResult = validateExerciseKey(settings, trimmedKey);
  if (!keyResult.success) {
    return keyResult;
  }

  const parsed = parseExerciseDataInput(input);
  if (!parsed.success) {
    return parsed;
  }
  // MCP's set_exercise_data only requires `key`, so reject a fieldless payload rather than writing a hidden
  // empty entry that immediately 404s on read. (valibot strips unknown keys, so this also catches a payload
  // of only unrecognized fields.)
  if (Object.keys(parsed.data).length === 0) {
    return err(
      400,
      "invalid_input",
      "At least one field (rm1, rounding, equipment, notes, muscleMultipliers, isUnilateral, or volumeMultiplier) is required"
    );
  }
  const base = settings.exerciseData[trimmedKey] ?? {};
  const applied = applyExerciseDataInput(settings, base, parsed.data);
  if (!applied.success) {
    return applied;
  }

  await writeExerciseData(user, trimmedKey, applied.data, di);
  return ok(formatExerciseData(trimmedKey, applied.data, user.storage.settings));
}

export async function ApiV1_deleteExerciseData(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  const existing = user.storage.settings.exerciseData[key];
  if (existing == null || isEmptyExerciseData(existing)) {
    return err(404, "not_found", "Exercise data not found");
  }

  // Empty the customization rather than removing the key — see writeExerciseData for why we never delete
  // keys (avoids a dictionary-field version tombstone). The emptied entry is hidden from list/get.
  await writeExerciseData(user, key, {}, di);
  return ok({ deleted: true as const });
}
