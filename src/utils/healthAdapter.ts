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

export interface IHealthAdapter {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  syncMeasurements(args: IHealthSyncArgs): Promise<IHealthSyncResult>;
  saveWorkout(args: IHealthWorkoutPayload): Promise<void>;
  saveMeasurements(args: IHealthMeasurementsPayload): Promise<void>;
}
