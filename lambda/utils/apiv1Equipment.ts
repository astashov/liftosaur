import * as v from "valibot";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import {
  IGym,
  IEquipmentData,
  IEquipment,
  IWeight,
  IUnit,
  ISettings,
  VEquipmentData,
  VUnit,
  VBuiltinEquipment,
} from "../../src/types";
import { Weight_print } from "../../src/models/weight";
import { Equipment_build, Equipment_isBuiltIn, Equipment_getCurrentGym } from "../../src/models/equipment";
import { equipmentName } from "../../src/models/exercise";
import { MathUtils_clamp } from "../../src/utils/math";
import { ObjectUtils_clone } from "../../src/utils/object";
import { UidFactory_generateUid } from "./generator";
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

const MAX_PLATE_KINDS = 50;
const MAX_PLATE_NUM = 200;
const MAX_FIXED = 200;
const MIN_MULTIPLIER = 1;
const MAX_MULTIPLIER = 10;
const MAX_NAME_LENGTH = 100;

function VBarWeight(unit: IUnit): v.GenericSchema<unknown, IWeight> {
  return v.pipe(
    VWeightString,
    v.check(
      (w) => w.unit === unit,
      `bar.${unit} must be expressed in ${unit} (e.g. "${unit === "lb" ? "45lb" : "20kg"}")`
    )
  );
}

const VPlateInput = v.object({
  weight: VWeightString,
  num: v.pipe(
    v.number(),
    v.transform((n) => MathUtils_clamp(Math.round(n), 0, MAX_PLATE_NUM))
  ),
});

// Trims + length-caps, and (unlike a bare optional string) rejects a non-string or an empty/whitespace-only
// name with a validation error rather than storing a nameless equipment.
const VEquipmentName = v.pipe(
  v.string(),
  v.transform((s) => s.trim().slice(0, MAX_NAME_LENGTH)),
  v.minLength(1, "Equipment name cannot be empty")
);

const VEquipmentUpdateInput = v.object({
  bar: v.optional(
    v.object({
      lb: v.optional(VBarWeight("lb")),
      kg: v.optional(VBarWeight("kg")),
    })
  ),
  plates: v.optional(
    v.pipe(
      v.array(VPlateInput),
      v.transform((arr) => arr.slice(0, MAX_PLATE_KINDS))
    )
  ),
  fixed: v.optional(
    v.pipe(
      v.array(VWeightString),
      v.transform((arr) => arr.slice(0, MAX_FIXED))
    )
  ),
  multiplier: v.optional(
    v.pipe(
      v.number(),
      v.transform((n) => MathUtils_clamp(Math.round(n), MIN_MULTIPLIER, MAX_MULTIPLIER))
    )
  ),
  isFixed: v.optional(v.boolean()),
  unit: v.optional(VUnit),
  name: v.optional(VEquipmentName),
  notes: v.optional(
    v.pipe(
      v.string(),
      v.transform((s) => s.slice(0, MAX_NOTES_LENGTH))
    )
  ),
  similarTo: v.optional(VBuiltinEquipment),
  useBodyweightForBar: v.optional(v.boolean()),
  isAssisting: v.optional(v.boolean()),
  // Soft-delete/restore: true hides the equipment but keeps it in storage (so exercises that reference it
  // for rounding don't dangle to a non-existent id); false restores it.
  isDeleted: v.optional(v.boolean()),
});

export type IEquipmentUpdateInput = v.InferOutput<typeof VEquipmentUpdateInput>;

// Every field of IEquipmentData must be classified here, so adding/removing a field to the
// interface is a compile error until its API handling is decided:
//   - "writable": settable through the API/MCP — must appear in VEquipmentUpdateInput (enforced below)
//   - "internal": managed by the server, never set from a request payload (e.g. the vtype discriminant tag)
// `as const satisfies` keeps the literal values while forcing exhaustiveness + rejecting unknown keys.
type IEquipmentFieldPolicy = "writable" | "internal";
const EQUIPMENT_FIELD_POLICY = {
  vtype: "internal",
  isDeleted: "writable",
  bar: "writable",
  multiplier: "writable",
  plates: "writable",
  fixed: "writable",
  isFixed: "writable",
  unit: "writable",
  name: "writable",
  notes: "writable",
  similarTo: "writable",
  useBodyweightForBar: "writable",
  isAssisting: "writable",
} as const satisfies Record<keyof IEquipmentData, IEquipmentFieldPolicy>;

export type IWritableEquipmentField = {
  [K in keyof typeof EQUIPMENT_FIELD_POLICY]: (typeof EQUIPMENT_FIELD_POLICY)[K] extends "writable" ? K : never;
}[keyof typeof EQUIPMENT_FIELD_POLICY];

export const EQUIPMENT_WRITABLE_FIELDS = (Object.keys(EQUIPMENT_FIELD_POLICY) as (keyof IEquipmentData)[]).filter(
  (k): k is IWritableEquipmentField => EQUIPMENT_FIELD_POLICY[k] === "writable"
);

// Forces the valibot input schema to accept exactly the "writable" fields and nothing else — if the
// policy and schema drift apart (e.g. a new writable field isn't added to VEquipmentUpdateInput), this
// assignment fails to compile because IExactUnion resolves to `false`. Exported only so noUnusedLocals
// doesn't flag this compile-time assertion (lambda's eslint config forbids the usual `void` marker).
export const _equipmentInputMatchesPolicy: IExactUnion<keyof IEquipmentUpdateInput, IWritableEquipmentField> = true;

function parseEquipmentInput(input: unknown): IApiResult<IEquipmentUpdateInput> {
  const result = v.safeParse(VEquipmentUpdateInput, input ?? {});
  if (!result.success) {
    return err(400, "invalid_input", issuesToMessage(result.issues));
  }
  return ok(result.output);
}

function applyEquipmentInput(base: IEquipmentData, input: IEquipmentUpdateInput): IApiResult<IEquipmentData> {
  const merged: IEquipmentData = {
    ...base,
    bar: input.bar ? { lb: input.bar.lb ?? base.bar.lb, kg: input.bar.kg ?? base.bar.kg } : base.bar,
    plates: input.plates ?? base.plates,
    fixed: input.fixed ?? base.fixed,
    multiplier: input.multiplier ?? base.multiplier,
    isFixed: input.isFixed ?? base.isFixed,
    unit: input.unit ?? base.unit,
    name: input.name ?? base.name,
    notes: input.notes ?? base.notes,
    similarTo: input.similarTo ?? base.similarTo,
    useBodyweightForBar: input.useBodyweightForBar ?? base.useBodyweightForBar,
    isAssisting: input.isAssisting ?? base.isAssisting,
    isDeleted: input.isDeleted ?? base.isDeleted,
  };

  // Final guard: the object that hits storage must satisfy the canonical schema.
  const validated = v.safeParse(VEquipmentData, merged);
  if (!validated.success) {
    return err(400, "invalid_input", issuesToMessage(validated.issues));
  }
  return ok(validated.output);
}

interface IEquipmentResponse {
  id: string;
  name: string;
  isCustom: boolean;
  isDeleted: boolean;
  unit?: IUnit;
  bar: { lb: string; kg: string };
  multiplier: number;
  isFixed: boolean;
  plates: { weight: string; num: number }[];
  fixed: string[];
  similarTo?: string;
  notes?: string;
  useBodyweightForBar?: boolean;
  isAssisting?: boolean;
}

function formatEquipment(key: string, d: IEquipmentData): IEquipmentResponse {
  return {
    id: key,
    name: d.name || equipmentName(key as IEquipment),
    isCustom: !Equipment_isBuiltIn(key),
    isDeleted: !!d.isDeleted,
    unit: d.unit,
    bar: { lb: Weight_print(d.bar.lb), kg: Weight_print(d.bar.kg) },
    multiplier: d.multiplier,
    isFixed: d.isFixed,
    plates: d.plates.map((p) => ({ weight: Weight_print(p.weight), num: p.num })),
    fixed: d.fixed.map((w) => Weight_print(w)),
    similarTo: d.similarTo,
    notes: d.notes,
    useBodyweightForBar: d.useBodyweightForBar,
    isAssisting: d.isAssisting,
  };
}

interface IGymResponse {
  id: string;
  name: string;
  isCurrent: boolean;
  equipmentCount: number;
}

function formatGym(gym: IGym, settings: ISettings): IGymResponse {
  const currentGymId = Equipment_getCurrentGym(settings).id;
  const equipmentCount = Object.values(gym.equipment).filter(
    (e): e is IEquipmentData => e != null && !e.isDeleted
  ).length;
  return { id: gym.id, name: gym.name, isCurrent: gym.id === currentGymId, equipmentCount };
}

// --- Gyms ---

export function ApiV1_listGyms(user: ILimitedUserDao): IApiResult<{ gyms: IGymResponse[]; currentGymId?: string }> {
  const settings = user.storage.settings;
  return ok({
    gyms: settings.gyms.map((g) => formatGym(g, settings)),
    currentGymId: Equipment_getCurrentGym(settings).id,
  });
}

const VGymName = v.pipe(
  v.string(),
  v.transform((s) => s.trim().slice(0, MAX_NAME_LENGTH)),
  v.minLength(1, "Gym name is required")
);

const VGymUpdateInput = v.object({
  name: v.optional(VGymName),
  setCurrent: v.optional(v.boolean()),
});

export async function ApiV1_createGym(
  userId: string,
  user: ILimitedUserDao,
  name: string,
  di: IDI
): Promise<IApiResult<IGymResponse>> {
  const parsedName = v.safeParse(VGymName, name);
  if (!parsedName.success) {
    return err(400, "invalid_input", issuesToMessage(parsedName.issues));
  }

  const settings = user.storage.settings;
  const sourceGym = Equipment_getCurrentGym(settings);
  const newGym: IGym = {
    vtype: "gym",
    id: UidFactory_generateUid(8),
    name: parsedName.output,
    equipment: ObjectUtils_clone(sourceGym.equipment),
  };

  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: { ...old.settings, gyms: [...old.settings.gyms, newGym] },
  }));

  return ok(formatGym(newGym, user.storage.settings));
}

export async function ApiV1_updateGym(
  userId: string,
  user: ILimitedUserDao,
  gymId: string,
  input: unknown,
  di: IDI
): Promise<IApiResult<IGymResponse>> {
  const gym = getGym(user.storage.settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }

  const parsed = v.safeParse(VGymUpdateInput, input ?? {});
  if (!parsed.success) {
    return err(400, "invalid_input", issuesToMessage(parsed.issues));
  }
  const { name, setCurrent } = parsed.output;
  const newName = name ?? gym.name;

  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      gyms: old.settings.gyms.map((g) => (g.id === gymId ? { ...g, name: newName } : g)),
      currentGymId: setCurrent ? gymId : old.settings.currentGymId,
    },
  }));

  return ok(formatGym({ ...gym, name: newName }, user.storage.settings));
}

export async function ApiV1_deleteGym(
  userId: string,
  user: ILimitedUserDao,
  gymId: string,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  const settings = user.storage.settings;
  const gym = getGym(settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }
  if (settings.gyms.length <= 1) {
    return err(400, "invalid_input", "Cannot delete the last gym");
  }

  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => {
    const remaining = old.settings.gyms.filter((g) => g.id !== gymId);
    const currentGymId = old.settings.currentGymId === gymId ? remaining[0]?.id : old.settings.currentGymId;
    return {
      ...old,
      settings: {
        ...old.settings,
        gyms: remaining,
        currentGymId,
        deletedGyms: Array.from(new Set([...(old.settings.deletedGyms ?? []), gymId])),
      },
    };
  });

  return ok({ deleted: true });
}

// --- Equipment ---

// Returns all equipment, including soft-deleted ones (flagged with isDeleted) — the same way the app
// keeps deleted equipment in storage so exercises that reference it by id (for weight rounding / the
// plate calculator, via settings.exerciseData[key].equipment[gymId]) don't point at a non-existent id.
export function ApiV1_listEquipment(
  user: ILimitedUserDao,
  gymId: string
): IApiResult<{ gymId: string; equipment: IEquipmentResponse[] }> {
  const gym = getGym(user.storage.settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }
  const equipment = Object.keys(gym.equipment)
    .map((key) => {
      const d = gym.equipment[key as IEquipment];
      return d != null ? formatEquipment(key, d) : undefined;
    })
    .filter((e): e is IEquipmentResponse => e != null);
  return ok({ gymId, equipment });
}

export function ApiV1_getEquipment(
  user: ILimitedUserDao,
  gymId: string,
  equipmentId: string
): IApiResult<IEquipmentResponse> {
  const gym = getGym(user.storage.settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }
  const d = gym.equipment[equipmentId as IEquipment];
  if (!d) {
    return err(404, "not_found", "Equipment not found");
  }
  return ok(formatEquipment(equipmentId, d));
}

async function writeEquipment(
  user: ILimitedUserDao,
  gymId: string,
  equipmentId: string,
  data: IEquipmentData,
  di: IDI
): Promise<void> {
  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      gyms: old.settings.gyms.map((g) =>
        g.id === gymId ? { ...g, equipment: { ...g.equipment, [equipmentId]: data } } : g
      ),
    },
  }));
}

export async function ApiV1_updateEquipment(
  userId: string,
  user: ILimitedUserDao,
  gymId: string,
  equipmentId: string,
  input: unknown,
  di: IDI
): Promise<IApiResult<IEquipmentResponse>> {
  const gym = getGym(user.storage.settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }
  const existing = gym.equipment[equipmentId as IEquipment];
  if (!existing) {
    return err(404, "not_found", "Equipment not found");
  }

  const parsed = parseEquipmentInput(input);
  if (!parsed.success) {
    return parsed;
  }
  const applied = applyEquipmentInput(existing, parsed.data);
  if (!applied.success) {
    return applied;
  }

  await writeEquipment(user, gymId, equipmentId, applied.data, di);
  return ok(formatEquipment(equipmentId, applied.data));
}

export async function ApiV1_createCustomEquipment(
  userId: string,
  user: ILimitedUserDao,
  gymId: string,
  name: string,
  input: unknown,
  di: IDI
): Promise<IApiResult<IEquipmentResponse>> {
  const gym = getGym(user.storage.settings, gymId);
  if (!gym) {
    return err(404, "not_found", "Gym not found");
  }
  const parsedName = v.safeParse(VEquipmentName, name);
  if (!parsedName.success) {
    return err(400, "invalid_input", issuesToMessage(parsedName.issues));
  }

  const parsed = parseEquipmentInput(input);
  if (!parsed.success) {
    return parsed;
  }
  const base = Equipment_build(parsedName.output);
  const applied = applyEquipmentInput(base, parsed.data);
  if (!applied.success) {
    return applied;
  }

  const equipmentId = `equipment-${UidFactory_generateUid(8)}`;
  await writeEquipment(user, gymId, equipmentId, applied.data, di);
  return ok(formatEquipment(equipmentId, applied.data));
}
