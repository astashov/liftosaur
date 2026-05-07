import {
  IHealthAdapter,
  IHealthMeasurementsPayload,
  IHealthSyncArgs,
  IHealthSyncResult,
  IHealthWorkoutPayload,
} from "../../src/utils/healthAdapter";

export class MockHealthAdapter implements IHealthAdapter {
  public available: boolean = true;
  public permissionsGranted: boolean = true;
  public requestPermissionsCalls: number = 0;
  public syncCalls: IHealthSyncArgs[] = [];
  public saveWorkoutCalls: IHealthWorkoutPayload[] = [];
  public saveMeasurementsCalls: IHealthMeasurementsPayload[] = [];
  public syncResultsQueue: Array<IHealthSyncResult | Error> = [];
  public defaultSyncResult: IHealthSyncResult = { added: [], deleted: [], anchor: "anchor-default" };

  public async isAvailable(): Promise<boolean> {
    return this.available;
  }

  public async requestPermissions(): Promise<boolean> {
    this.requestPermissionsCalls += 1;
    return this.permissionsGranted;
  }

  public async syncMeasurements(args: IHealthSyncArgs): Promise<IHealthSyncResult> {
    this.syncCalls.push(args);
    if (this.syncResultsQueue.length > 0) {
      const next = this.syncResultsQueue.shift()!;
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }
    return this.defaultSyncResult;
  }

  public async saveWorkout(args: IHealthWorkoutPayload): Promise<void> {
    this.saveWorkoutCalls.push(args);
  }

  public async saveMeasurements(args: IHealthMeasurementsPayload): Promise<void> {
    this.saveMeasurementsCalls.push(args);
  }
}
