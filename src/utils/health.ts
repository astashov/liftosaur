import {
  IHealthAdapter,
  IHealthDailyArgs,
  IHealthDailyResult,
  IHealthMeasurementsPayload,
  IHealthSyncArgs,
  IHealthSyncResult,
  IHealthWorkoutPayload,
} from "./healthAdapter";

export class HealthAdapter implements IHealthAdapter {
  public async isAvailable(): Promise<boolean> {
    return false;
  }
  public async requestPermissions(): Promise<boolean> {
    return false;
  }
  public async syncMeasurements(_args: IHealthSyncArgs): Promise<IHealthSyncResult> {
    return { added: [], deleted: [], anchor: "" };
  }
  public async syncDailyMetrics(_args: IHealthDailyArgs): Promise<IHealthDailyResult> {
    return { values: [] };
  }
  public async saveWorkout(_args: IHealthWorkoutPayload): Promise<void> {}
  public async saveMeasurements(_args: IHealthMeasurementsPayload): Promise<void> {}
}
