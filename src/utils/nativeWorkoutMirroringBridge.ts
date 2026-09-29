import { IDesiredWorkout, INativeWorkoutMirroringEvent, IWorkoutMirroring } from "./workoutMirroring";

export type { INativeWorkoutMirroringEvent } from "./workoutMirroring";

export class WorkoutMirroring implements IWorkoutMirroring {
  public setDesiredWorkout(_desired: IDesiredWorkout): void {}

  public subscribe(_handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
    return () => {};
  }
}
