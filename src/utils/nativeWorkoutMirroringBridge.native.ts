import { Platform } from "react-native";
import NativeLiftosaurWorkoutMirroring from "../specs/NativeLiftosaurWorkoutMirroring";
import { HeartRateReading_parseEvent } from "../models/heartRateReading";
import { IDesiredWorkout, INativeWorkoutMirroringEvent, IWorkoutMirroring } from "./workoutMirroring";

export type { INativeWorkoutMirroringEvent } from "./workoutMirroring";

export class WorkoutMirroring implements IWorkoutMirroring {
  private getModule(): typeof NativeLiftosaurWorkoutMirroring | null {
    if (Platform.OS !== "ios") {
      return null;
    }
    return NativeLiftosaurWorkoutMirroring;
  }

  public setDesiredWorkout(desired: IDesiredWorkout): void {
    this.getModule()?.setDesiredWorkout(desired.workoutId ?? 0, desired.status, desired.expectWatch);
  }

  public subscribe(handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
    const mod = this.getModule();
    if (mod == null) {
      return () => {};
    }
    const subscription = mod.onMirroringEvent((raw) => {
      const event = HeartRateReading_parseEvent(raw);
      if (event != null) {
        handler(event);
      }
    });
    mod.flushPendingEvents().catch(() => {});
    return () => subscription.remove();
  }
}
