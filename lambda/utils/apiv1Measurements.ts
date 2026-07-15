import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import {
  ILength,
  ILengthUnit,
  IPercentage,
  IStats,
  IStatsHealth,
  IStatsHealthValue,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
  IUnit,
  IWeight,
  lengthUnits,
  statsHealthDef,
  statsLengthDef,
  statsPercentageDef,
  statsWeightDef,
  units,
} from "../../src/types";
import { Weight_build, Weight_buildPct } from "../../src/models/weight";
import { Length_build } from "../../src/models/length";
import { MathUtils_roundFloat, MathUtils_clamp } from "../../src/utils/math";
import { IApiResult, err, ok } from "./apiv1Common";

type IMeasurementCategory = "weight" | "length" | "percentage" | "health";
// Health values are imported daily aggregates from Apple Health / Health Connect — the API exposes them
// read-only (the app itself only hides them, never edits; an edit would just be overwritten by re-sync).
type IMeasurementWriteCategory = Exclude<IMeasurementCategory, "health">;

// The stat categories share a single flat key namespace because their keys never collide:
// weight -> "weight", percentage -> "bodyfat", length -> the 13 body-part keys, health -> sleep/calories/
// protein. Resolving a key to its category lets the REST/MCP surface address every measurement by key
// alone (e.g. "chest", "bodyfat", "sleep").
const MEASUREMENT_CATEGORY_BY_KEY: Record<string, IMeasurementCategory> = {
  ...statsWeightDef.reduce<Record<string, IMeasurementCategory>>((memo, k) => ({ ...memo, [k]: "weight" }), {}),
  ...statsLengthDef.reduce<Record<string, IMeasurementCategory>>((memo, k) => ({ ...memo, [k]: "length" }), {}),
  ...statsPercentageDef.reduce<Record<string, IMeasurementCategory>>((memo, k) => ({ ...memo, [k]: "percentage" }), {}),
  ...statsHealthDef.reduce<Record<string, IMeasurementCategory>>((memo, k) => ({ ...memo, [k]: "health" }), {}),
};

export const MEASUREMENT_KEYS = Object.keys(MEASUREMENT_CATEGORY_BY_KEY);
export const MEASUREMENT_WRITE_KEYS = MEASUREMENT_KEYS.filter((k) => MEASUREMENT_CATEGORY_BY_KEY[k] !== "health");

// The stored value is a plain number whose unit is implied by the key; the suffix is only a formatting
// concern of this API surface (mirroring the "180lb" style of the other categories).
const HEALTH_UNIT_BY_KEY: Record<(typeof statsHealthDef)[number], string> = {
  sleep: "min",
  calories: "kcal",
  protein: "g",
};

// Length values are clamped to a generous range that covers both cm and inches (no body part exceeds it),
// rejecting obviously-bad input without coupling the limit to the unit.
const MAX_WEIGHT = 5000;
const MAX_LENGTH = 1000;
const MAX_PERCENTAGE = 100;

const UNITS_BY_CATEGORY: Record<IMeasurementWriteCategory, readonly string[]> = {
  weight: units,
  length: lengthUnits,
  percentage: ["%"],
};

// Identity (update/delete) and cursor timestamps must be exact unix-epoch-ms integers. parseInt would
// silently accept "1700000000000abc" as 1700000000000 and hit the wrong record / page — so require all
// digits (or an integer number from MCP clients).
function parseStrictTimestamp(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw >= 0 ? raw : undefined;
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    return Number.isSafeInteger(n) ? n : undefined;
  }
  return undefined;
}

const VALUE_EXAMPLE_BY_CATEGORY: Record<IMeasurementWriteCategory, string> = {
  weight: "'180lb' or '82kg'",
  length: "'37cm' or '14.75in'",
  percentage: "'18%'",
};

function maxValueFor(category: IMeasurementWriteCategory): number {
  switch (category) {
    case "weight":
      return MAX_WEIGHT;
    case "length":
      return MAX_LENGTH;
    case "percentage":
      return MAX_PERCENTAGE;
  }
}

// Accepts a unix epoch in ms (number or numeric string) or an ISO 8601 date string; returns epoch ms. The
// timestamp doubles as the value's stable id (the stats row key is `${timestamp}_${statKey}`), so it must
// round-trip exactly — we don't re-derive it from a formatted date.
function parseTimestamp(input: unknown): number | undefined {
  if (typeof input === "number") {
    return isFinite(input) ? Math.round(input) : undefined;
  }
  if (typeof input === "string" && input.trim() !== "") {
    const trimmed = input.trim();
    const asNum = Number(trimmed);
    if (isFinite(asNum) && /^\d+$/.test(trimmed)) {
      return Math.round(asNum);
    }
    const parsed = Date.parse(trimmed);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

interface IMeasurementWriteInput {
  value?: unknown;
  timestamp?: unknown;
}

// Every value is a number plus an explicit unit suffix (e.g. "180lb", "82kg", "37cm", "14.75in", "18%"),
// matching how the rest of the API represents weights (exerciseData.rm1, equipment). The suffix is required —
// there's no defaulting to the user's units setting — so a value is unambiguous on its own.
function parseMeasurementValue(
  category: IMeasurementWriteCategory,
  raw: unknown
): IApiResult<IWeight | ILength | IPercentage> {
  if (typeof raw !== "string") {
    return err(400, "invalid_input", `value must be a string like ${VALUE_EXAMPLE_BY_CATEGORY[category]}`);
  }
  const match = raw.trim().match(/^([-+]?\d+(?:\.\d+)?)\s*(lb|kg|cm|in|%)$/i);
  if (!match) {
    return err(
      400,
      "invalid_input",
      `Invalid value '${raw}'. Expected a number with a unit suffix, e.g. ${VALUE_EXAMPLE_BY_CATEGORY[category]}.`
    );
  }
  const unit = match[2].toLowerCase();
  if (!UNITS_BY_CATEGORY[category].includes(unit)) {
    return err(
      400,
      "invalid_input",
      `Unit '${unit}' is not valid for a ${category} measurement. Use ${UNITS_BY_CATEGORY[category].join(" or ")}.`
    );
  }
  const clamped = MathUtils_roundFloat(MathUtils_clamp(parseFloat(match[1]), 0, maxValueFor(category)), 3);
  switch (category) {
    case "weight":
      return ok(Weight_build(clamped, unit as IUnit));
    case "length":
      return ok(Length_build(clamped, unit as ILengthUnit));
    case "percentage":
      return ok(Weight_buildPct(clamped));
  }
}

interface IMeasurementValueResponse {
  timestamp: number;
  date: string;
  value: string;
}

// The list endpoint is a bounded per-key overview (latest value + count) — never the full series, which
// can run to thousands of values for a daily-logged key like bodyweight. Read the series page-by-page
// through getMeasurement instead.
interface IMeasurementSummaryResponse {
  key: string;
  category: IMeasurementCategory;
  count: number;
  latest?: IMeasurementValueResponse;
}

interface IMeasurementPageResponse {
  key: string;
  category: IMeasurementCategory;
  values: IMeasurementValueResponse[];
  hasMore: boolean;
  nextCursor?: number;
}

type IAnyStatValue = IStatsWeightValue | IStatsLengthValue | IStatsPercentageValue | IStatsHealthValue;
type IWriteStatValue = IStatsWeightValue | IStatsLengthValue | IStatsPercentageValue;

function valuesForKey(stats: IStats, key: string, category: IMeasurementCategory): IAnyStatValue[] {
  switch (category) {
    case "weight":
      return stats.weight[key as keyof typeof stats.weight] || [];
    case "length":
      return stats.length[key as keyof typeof stats.length] || [];
    case "percentage":
      return stats.percentage[key as keyof typeof stats.percentage] || [];
    case "health":
      // Hidden records are the user's "delete" for read-only imported data — never surface them here.
      return (stats.health?.[key as keyof IStatsHealth] || []).filter((v) => !v.hidden);
  }
}

function formatValue(key: string, stat: IAnyStatValue): IMeasurementValueResponse {
  return {
    timestamp: stat.timestamp,
    date: new Date(stat.timestamp).toISOString(),
    // Compact "<number><unit>" form, e.g. "180lb"/"37cm"/"18%"/"432min". Not Length_print, which renders
    // inches as a `"` suffix — we keep the canonical suffixes used everywhere on this surface. Health
    // values are stored as plain numbers, so their unit comes from the key.
    value:
      typeof stat.value === "number"
        ? `${stat.value}${HEALTH_UNIT_BY_KEY[key as keyof typeof HEALTH_UNIT_BY_KEY]}`
        : `${stat.value.value}${stat.value.unit}`,
  };
}

function sortedValues(stats: IStats, key: string, category: IMeasurementCategory): IAnyStatValue[] {
  return [...valuesForKey(stats, key, category)].sort((a, b) => b.timestamp - a.timestamp);
}

function categoryForKey(key: string): IMeasurementCategory | undefined {
  return MEASUREMENT_CATEGORY_BY_KEY[key];
}

function unknownKeyError<T>(key: string): IApiResult<T> {
  return err(400, "invalid_input", `Unknown measurement '${key}'. Valid measurements: ${MEASUREMENT_KEYS.join(", ")}.`);
}

// The path/arg timestamp identifies which value to update/delete; a non-numeric one (e.g. ".../abc") is a
// client error, not a missing record — reject it as 400 rather than letting NaN fall through to a 404.
function invalidTimestampError<T>(): IApiResult<T> {
  return err(400, "invalid_input", "Invalid measurement timestamp; expected a unix epoch ms identifier.");
}

function healthReadOnlyError<T>(key: string): IApiResult<T> {
  return err(
    400,
    "invalid_input",
    `'${key}' is imported automatically from Apple Health / Health Connect and can't be added or edited through the API. To remove a record from view, delete it — imported records are hidden rather than deleted, and can be unhidden from the app's Sleep & Nutrition screen.`
  );
}

export async function ApiV1_listMeasurements(
  userId: string,
  user: ILimitedUserDao,
  di: IDI
): Promise<IApiResult<{ measurements: IMeasurementSummaryResponse[] }>> {
  const userDao = new UserDao(di);
  const stats = await userDao.getStatsByUserId(userId);
  const measurements = MEASUREMENT_KEYS.map((key) => {
    const category = MEASUREMENT_CATEGORY_BY_KEY[key];
    const values = sortedValues(stats, key, category);
    return {
      key,
      category,
      count: values.length,
      latest: values.length > 0 ? formatValue(key, values[0]) : undefined,
    };
  }).filter((m) => m.count > 0);
  return ok({ measurements });
}

export async function ApiV1_getMeasurement(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  params: { limit?: string; cursor?: string },
  di: IDI
): Promise<IApiResult<IMeasurementPageResponse>> {
  const category = categoryForKey(key);
  if (!category) {
    return unknownKeyError(key);
  }
  const userDao = new UserDao(di);
  // Clamp limit to a sane 1..200 (a 0/negative limit would become Limit: 0 and Dynamo rejects that).
  const rawLimit = parseInt(params.limit ?? "", 10);
  const limit = isNaN(rawLimit) ? 50 : MathUtils_clamp(rawLimit, 1, 200);
  // A non-numeric cursor must be rejected up front — passing NaN through as :timestamp is a Dynamo
  // request error (a 500), not the 400 the client deserves.
  let cursor: number | undefined;
  if (params.cursor != null && params.cursor !== "") {
    cursor = parseStrictTimestamp(params.cursor);
    if (cursor == null) {
      return err(
        400,
        "invalid_input",
        "Invalid 'cursor'. Expected a unix epoch ms timestamp from a previous page's nextCursor."
      );
    }
  }
  // Pull one extra row to detect hasMore. The DAO returns values newest-first; the cursor is the
  // last-returned timestamp, so the next page is everything strictly older than it.
  const rows = await userDao.getStatsPage(userId, { statKey: key, beforeTimestamp: cursor, limit: limit + 1 });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].timestamp : undefined;
  // User-hidden health records are dropped AFTER hasMore/nextCursor are computed from the raw page, so
  // the cursor still advances past them (a page may return fewer than `limit` values, which is fine).
  const visible = page.filter((v) => !("hidden" in v && v.hidden));

  return ok({
    key,
    category,
    values: visible.map((v) => formatValue(key, v)),
    hasMore,
    nextCursor,
  });
}

// Writes go through applyStorageUpdate (which bumps `_versions` for the changed atomic stat) plus a
// side-effect that persists the single stats-table row — mirroring how history records are written, since
// stats live in their own table and store() strips them from the user blob.
async function writeStatChange(
  userId: string,
  user: ILimitedUserDao,
  di: IDI,
  buildNewStats: (stats: IStats) => IStats,
  sideEffects: (userDao: UserDao) => Promise<unknown>[]
): Promise<void> {
  const userDao = new UserDao(di);
  const stats = await userDao.getStatsByUserId(userId);
  user.storage = { ...user.storage, stats };
  const newStats = buildNewStats(stats);
  await userDao.applyStorageUpdate(user, (old) => ({ ...old, stats: newStats }), sideEffects(userDao));
}

function setValuesForKey(
  stats: IStats,
  key: string,
  category: IMeasurementWriteCategory,
  values: IAnyStatValue[]
): IStats {
  switch (category) {
    case "weight":
      return { ...stats, weight: { ...stats.weight, [key]: values as IStatsWeightValue[] } };
    case "length":
      return { ...stats, length: { ...stats.length, [key]: values as IStatsLengthValue[] } };
    case "percentage":
      return { ...stats, percentage: { ...stats.percentage, [key]: values as IStatsPercentageValue[] } };
  }
}

export async function ApiV1_addMeasurement(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  input: IMeasurementWriteInput,
  di: IDI
): Promise<IApiResult<IMeasurementValueResponse>> {
  const category = categoryForKey(key);
  if (!category) {
    return unknownKeyError(key);
  }
  if (category === "health") {
    return healthReadOnlyError(key);
  }
  const built = parseMeasurementValue(category, input.value);
  if (!built.success) {
    return built;
  }

  let timestamp = Date.now();
  if (input.timestamp != null) {
    const parsedTs = parseTimestamp(input.timestamp);
    if (parsedTs == null) {
      return err(400, "invalid_input", "Invalid 'timestamp'. Use unix epoch ms or an ISO 8601 date string.");
    }
    timestamp = parsedTs;
  }

  const userDao = new UserDao(di);
  const existingStats = await userDao.getStatsByUserId(userId);
  const existing = valuesForKey(existingStats, key, category).find((s) => s.timestamp === timestamp);
  if (existing) {
    return err(
      409,
      "conflict",
      `A '${key}' measurement already exists at timestamp ${timestamp}. Use the update endpoint to change it.`
    );
  }

  const stat = { vtype: "stat" as const, value: built.data, timestamp, updatedAt: timestamp } as IWriteStatValue;
  await writeStatChange(
    userId,
    user,
    di,
    (stats) => setValuesForKey(stats, key, category, [stat, ...valuesForKey(stats, key, category)]),
    (dao) => [dao.saveStat(userId, key, category, stat)]
  );
  return ok(formatValue(key, stat));
}

export async function ApiV1_updateMeasurement(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  timestampRaw: string | number,
  input: IMeasurementWriteInput,
  di: IDI
): Promise<IApiResult<IMeasurementValueResponse>> {
  const category = categoryForKey(key);
  if (!category) {
    return unknownKeyError(key);
  }
  if (category === "health") {
    return healthReadOnlyError(key);
  }
  const timestamp = parseStrictTimestamp(timestampRaw);
  if (timestamp == null) {
    return invalidTimestampError();
  }
  // The timestamp is the value's identity (the row key is `${timestamp}_${statKey}`), so update only changes
  // the reading. To re-date an entry, delete it and add it at the new timestamp.
  const built = parseMeasurementValue(category, input.value);
  if (!built.success) {
    return built;
  }

  const userDao = new UserDao(di);
  const stats = await userDao.getStatsByUserId(userId);
  const current = valuesForKey(stats, key, category).find((s) => s.timestamp === timestamp);
  if (!current) {
    return err(404, "not_found", "Measurement not found");
  }

  const updated = { vtype: "stat" as const, value: built.data, timestamp, updatedAt: Date.now() } as IWriteStatValue;
  await writeStatChange(
    userId,
    user,
    di,
    (st) =>
      setValuesForKey(
        st,
        key,
        category,
        valuesForKey(st, key, category).map((s) => (s.timestamp === timestamp ? updated : s))
      ),
    (dao) => [dao.saveStat(userId, key, category, updated)]
  );

  return ok(formatValue(key, updated));
}

export async function ApiV1_deleteMeasurement(
  userId: string,
  user: ILimitedUserDao,
  key: string,
  timestampRaw: string | number,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  const category = categoryForKey(key);
  if (!category) {
    return unknownKeyError(key);
  }
  const timestamp = parseStrictTimestamp(timestampRaw);
  if (timestamp == null) {
    return invalidTimestampError();
  }
  const userDao = new UserDao(di);
  const stats = await userDao.getStatsByUserId(userId);
  const current = valuesForKey(stats, key, category).find((s) => s.timestamp === timestamp);
  if (!current) {
    return err(404, "not_found", "Measurement not found");
  }

  // For imported health records "delete" means hide: a true delete would just be re-created by the next
  // windowed re-read, while `hidden` is excluded from every API read and survives re-imports — so the
  // observable contract of DELETE holds. (An already-hidden record 404s above, since reads filter hidden.)
  // Unhide is only possible from the app's Sleep & Nutrition screen.
  if (category === "health") {
    const hiddenStat: IStatsHealthValue = { ...(current as IStatsHealthValue), hidden: true };
    await writeStatChange(
      userId,
      user,
      di,
      (st) => ({
        ...st,
        health: {
          ...st.health,
          [key]: (st.health?.[key as keyof IStatsHealth] || []).map((v) =>
            v.timestamp === timestamp ? hiddenStat : v
          ),
        },
      }),
      (dao) => [dao.saveStat(userId, key, "health", hiddenStat)]
    );
    return ok({ deleted: true as const });
  }

  await writeStatChange(
    userId,
    user,
    di,
    (st) =>
      setValuesForKey(
        st,
        key,
        category,
        valuesForKey(st, key, category).filter((s) => s.timestamp !== timestamp)
      ),
    (dao) => [dao.deleteStat(userId, key, timestamp)]
  );

  return ok({ deleted: true as const });
}
