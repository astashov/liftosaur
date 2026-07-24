import { ILength, ILengthUnit, IPercentage, IUnit, IWeight } from "../types";

export type IHealthMeasurementType = "bodyweight" | "bodyfat" | "waist";

export interface IHealthMeasurement {
  timestamp: number;
  type: IHealthMeasurementType;
  uuid: string;
  value: IWeight | IPercentage | ILength;
}

export interface IHealthSyncResult {
  added: IHealthMeasurement[];
  deleted: string[];
  anchor: string;
}

export interface IHealthSyncArgs {
  anchor?: string;
  weightUnit: IUnit;
  lengthUnit: ILengthUnit;
}

export interface IHealthWorkoutPayload {
  startMs: number;
  endMs: number;
  calories: number;
  intervals: [number, number | null][];
}

export interface IHealthMeasurementsPayload {
  bodyweight?: IWeight;
  bodyfat?: IPercentage;
  waist?: ILength;
  timestamp: number;
}

export type IHealthDailyMetric = "sleep" | "calories" | "protein";

// A daily-aggregated value imported from the platform health store. `value` is sleep minutes,
// dietary calories (kcal) or protein grams depending on `type`; `timestamp` is the local-midnight
// ms of the day it belongs to; `uuid` is a stable per-day id so re-syncs upsert instead of dup.
export interface IHealthDailyValue {
  type: IHealthDailyMetric;
  timestamp: number;
  value: number;
  uuid: string;
}

export interface IHealthDailyArgs {
  windowDays: number;
  metrics: IHealthDailyMetric[];
}

export interface IHealthDailyResult {
  values: IHealthDailyValue[];
}

export interface IHealthAdapter {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  syncMeasurements(args: IHealthSyncArgs): Promise<IHealthSyncResult>;
  syncDailyMetrics(args: IHealthDailyArgs): Promise<IHealthDailyResult>;
  saveWorkout(args: IHealthWorkoutPayload): Promise<void>;
  saveMeasurements(args: IHealthMeasurementsPayload): Promise<void>;
}
