import {
  ExerciseType,
  getChanges,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
  type WeightRecord,
  type BodyFatRecord,
} from "react-native-health-connect";
import {
  IHealthAdapter,
  IHealthMeasurement,
  IHealthMeasurementsPayload,
  IHealthSyncArgs,
  IHealthSyncResult,
  IHealthWorkoutPayload,
} from "./healthAdapter";
import { IUnit } from "../types";
import { HealthAndroidFilter_isSelfOrigin } from "./healthAndroidFilter";

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const MAX_PAGES = 25;

const READ_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "BodyFat" },
];

const MEASUREMENT_WRITE_PERMISSIONS: Permission[] = [
  { accessType: "write", recordType: "Weight" },
  { accessType: "write", recordType: "BodyFat" },
];

const WORKOUT_WRITE_PERMISSIONS: Permission[] = [
  { accessType: "write", recordType: "ExerciseSession" },
  { accessType: "write", recordType: "ActiveCaloriesBurned" },
];

const WRITE_PERMISSIONS: Permission[] = [...MEASUREMENT_WRITE_PERMISSIONS, ...WORKOUT_WRITE_PERMISSIONS];

interface IMassResult {
  inKilograms: number;
  inPounds: number;
}

interface IWeightRecordResult extends Omit<WeightRecord, "weight"> {
  weight: IMassResult;
}

interface IBodyFatRecordResult extends BodyFatRecord {
  percentage: number;
}

type IHealthRecord = IWeightRecordResult | IBodyFatRecordResult;

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) {
    return true;
  }
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return false;
  }
  initialized = await initialize();
  return initialized;
}

function clampWorkoutEnd(startMs: number, endMs: number): number {
  const maxEnd = startMs + 3 * 24 * 60 * 60 * 1000;
  return Math.min(Math.max(endMs, startMs), maxEnd);
}

function workoutBounds(
  intervals: [number, number | null][],
  fallbackStart: number,
  fallbackEnd: number
): [number, number] {
  let start: number | undefined;
  let end: number | undefined;
  for (const [s, e] of intervals) {
    if (e == null) {
      continue;
    }
    if (s >= e) {
      continue;
    }
    if (start == null || s < start) {
      start = s;
    }
    if (end == null || e > end) {
      end = e;
    }
  }
  return [start ?? fallbackStart, clampWorkoutEnd(start ?? fallbackStart, end ?? fallbackEnd)];
}

export class HealthAdapter implements IHealthAdapter {
  public async isAvailable(): Promise<boolean> {
    return ensureInitialized();
  }

  public async requestPermissions(): Promise<boolean> {
    if (!(await ensureInitialized())) {
      return false;
    }
    const allPerms = [...READ_PERMISSIONS, ...WRITE_PERMISSIONS];
    const granted = await requestPermission(allPerms);
    return allPerms.every((needed) =>
      granted.some(
        (g) => (g as Permission).accessType === needed.accessType && (g as Permission).recordType === needed.recordType
      )
    );
  }

  public async syncMeasurements(args: IHealthSyncArgs): Promise<IHealthSyncResult> {
    if (!(await ensureInitialized())) {
      return { added: [], deleted: [], anchor: args.anchor ?? "" };
    }
    const granted = await this.ensurePermissions(READ_PERMISSIONS);
    if (!granted) {
      return { added: [], deleted: [], anchor: args.anchor ?? "" };
    }
    if (!args.anchor) {
      return this.fullSync(args);
    }
    return this.incrementalSync(args, args.anchor);
  }

  public async saveWorkout(args: IHealthWorkoutPayload): Promise<void> {
    if (!(await ensureInitialized())) {
      return;
    }
    const granted = await this.ensurePermissions(WORKOUT_WRITE_PERMISSIONS);
    if (!granted) {
      return;
    }
    const [startMs, endMs] = workoutBounds(args.intervals, args.startMs, args.endMs);
    if (startMs > endMs) {
      return;
    }
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const calories = Math.max(0, args.calories);
    const clientRecordId = `${startMs}`;
    await insertRecords([
      {
        recordType: "ExerciseSession",
        startTime: startIso,
        endTime: endIso,
        exerciseType: ExerciseType.WEIGHTLIFTING,
        segments: [],
        metadata: { clientRecordId, clientRecordVersion: 0 },
      },
      {
        recordType: "ActiveCaloriesBurned",
        startTime: startIso,
        endTime: endIso,
        energy: { value: calories, unit: "kilocalories" },
        metadata: { clientRecordId, clientRecordVersion: 0 },
      },
    ]);
  }

  public async saveMeasurements(args: IHealthMeasurementsPayload): Promise<void> {
    if (!(await ensureInitialized())) {
      return;
    }
    const granted = await this.ensurePermissions(MEASUREMENT_WRITE_PERMISSIONS);
    if (!granted) {
      return;
    }
    const time = new Date(args.timestamp).toISOString();
    const records: Parameters<typeof insertRecords>[0] = [];
    if (args.bodyweight) {
      records.push({
        recordType: "Weight",
        time,
        weight: {
          value: args.bodyweight.value,
          unit: args.bodyweight.unit === "kg" ? "kilograms" : "pounds",
        },
        metadata: { clientRecordId: `${args.timestamp}-w`, clientRecordVersion: 0 },
      });
    }
    if (args.bodyfat) {
      records.push({
        recordType: "BodyFat",
        time,
        percentage: args.bodyfat.value,
        metadata: { clientRecordId: `${args.timestamp}-bf`, clientRecordVersion: 0 },
      });
    }
    if (records.length > 0) {
      await insertRecords(records);
    }
  }

  private async ensurePermissions(needed: Permission[]): Promise<boolean> {
    const granted = await getGrantedPermissions();
    const hasAll = needed.every((n) =>
      granted.some(
        (g) => (g as Permission).accessType === n.accessType && (g as Permission).recordType === n.recordType
      )
    );
    if (hasAll) {
      return true;
    }
    const requested = await requestPermission(needed);
    return needed.every((n) =>
      requested.some(
        (g) => (g as Permission).accessType === n.accessType && (g as Permission).recordType === n.recordType
      )
    );
  }

  private async fullSync(args: IHealthSyncArgs): Promise<IHealthSyncResult> {
    const now = new Date();
    const start = new Date(now.getTime() - FIVE_YEARS_MS);
    const filter = { operator: "between", startTime: start.toISOString(), endTime: now.toISOString() } as const;

    const [weights, fats] = await Promise.all([
      this.readAllPages("Weight", filter),
      this.readAllPages("BodyFat", filter),
    ]);

    const added: IHealthMeasurement[] = [];
    for (const record of weights) {
      if (HealthAndroidFilter_isSelfOrigin(record)) {
        continue;
      }
      const m = this.weightRecordToMeasurement(record as unknown as IWeightRecordResult, args.weightUnit);
      if (m) {
        added.push(m);
      }
    }
    for (const record of fats) {
      if (HealthAndroidFilter_isSelfOrigin(record)) {
        continue;
      }
      const m = this.bodyFatRecordToMeasurement(record as unknown as IBodyFatRecordResult);
      if (m) {
        added.push(m);
      }
    }

    const tokenRes = await getChanges({
      recordTypes: ["Weight", "BodyFat"],
    });

    return { added, deleted: [], anchor: tokenRes.nextChangesToken };
  }

  private async readAllPages<T extends "Weight" | "BodyFat">(
    recordType: T,
    timeRangeFilter: { operator: "between"; startTime: string; endTime: string }
  ): Promise<unknown[]> {
    const all: unknown[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const res = await readRecords(recordType, { timeRangeFilter, pageToken });
      for (const r of res.records) {
        all.push(r);
      }
      if (!res.pageToken) {
        break;
      }
      pageToken = res.pageToken;
    }
    return all;
  }

  private async incrementalSync(args: IHealthSyncArgs, token: string): Promise<IHealthSyncResult> {
    const added: IHealthMeasurement[] = [];
    const deleted: string[] = [];
    let nextToken = token;
    for (let i = 0; i < MAX_PAGES; i++) {
      const res = await getChanges({ changesToken: nextToken });
      if (res.changesTokenExpired) {
        return this.fullSync(args);
      }
      for (const change of res.upsertionChanges) {
        const record = change.record as unknown as IHealthRecord;
        if (HealthAndroidFilter_isSelfOrigin(record)) {
          continue;
        }
        if (record.recordType === "Weight") {
          const m = this.weightRecordToMeasurement(record as IWeightRecordResult, args.weightUnit);
          if (m) {
            added.push(m);
          }
        } else if (record.recordType === "BodyFat") {
          const m = this.bodyFatRecordToMeasurement(record as IBodyFatRecordResult);
          if (m) {
            added.push(m);
          }
        }
      }
      for (const change of res.deletionChanges) {
        deleted.push(change.recordId);
      }
      nextToken = res.nextChangesToken;
      if (!res.hasMore) {
        break;
      }
    }
    return { added, deleted, anchor: nextToken };
  }

  private weightRecordToMeasurement(record: IWeightRecordResult, weightUnit: IUnit): IHealthMeasurement | undefined {
    const ts = new Date(record.time).getTime();
    const value = weightUnit === "kg" ? record.weight.inKilograms : record.weight.inPounds;
    return {
      timestamp: ts,
      type: "bodyweight",
      uuid: record.metadata?.clientRecordId ?? record.metadata?.id ?? `${ts}-w`,
      value: { value, unit: weightUnit },
    };
  }

  private bodyFatRecordToMeasurement(record: IBodyFatRecordResult): IHealthMeasurement | undefined {
    const ts = new Date(record.time).getTime();
    return {
      timestamp: ts,
      type: "bodyfat",
      uuid: record.metadata?.clientRecordId ?? record.metadata?.id ?? `${ts}-bf`,
      value: { value: record.percentage, unit: "%" },
    };
  }
}
