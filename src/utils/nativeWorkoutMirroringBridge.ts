import { INativeWorkoutMirroringEvent, IWorkoutMirroring } from "./workoutMirroring";

export type { INativeWorkoutMirroringEvent } from "./workoutMirroring";

export class WorkoutMirroring implements IWorkoutMirroring {
  public startWatchWorkout(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public pauseWatchWorkout(): void {}

  public resumeWatchWorkout(): void {}

  public endWatchWorkout(): void {}

  public resetWatchWorkoutState(): void {}

  public isHealthKitAvailable(): boolean {
    return false;
  }

  public subscribe(_handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
    return () => {};
  }
}
