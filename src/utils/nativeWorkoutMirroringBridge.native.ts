import { Platform } from "react-native";
import NativeLiftosaurWorkoutMirroring from "../specs/NativeLiftosaurWorkoutMirroring";
import { INativeWorkoutMirroringEvent, IWorkoutMirroring } from "./workoutMirroring";

export type { INativeWorkoutMirroringEvent } from "./workoutMirroring";

export class WorkoutMirroring implements IWorkoutMirroring {
  private getModule(): typeof NativeLiftosaurWorkoutMirroring | null {
    if (Platform.OS !== "ios") {
      return null;
    }
    return NativeLiftosaurWorkoutMirroring;
  }

  public async startWatchWorkout(): Promise<boolean> {
    const mod = this.getModule();
    if (mod == null) {
      return false;
    }
    try {
      return await mod.startWatchWorkout();
    } catch (e) {
      console.warn("NativeWorkoutMirroring.startWatchWorkout failed", e);
      return false;
    }
  }

  public pauseWatchWorkout(): void {
    this.getModule()
      ?.pauseWatchWorkout()
      .catch(() => {});
  }

  public resumeWatchWorkout(): void {
    this.getModule()
      ?.resumeWatchWorkout()
      .catch(() => {});
  }

  public endWatchWorkout(): void {
    this.getModule()
      ?.endWatchWorkout()
      .catch(() => {});
  }

  public resetWatchWorkoutState(): void {
    this.getModule()
      ?.resetWatchWorkoutState()
      .catch(() => {});
  }

  public isHealthKitAvailable(): boolean {
    return this.getModule()?.isHealthKitAvailable() ?? false;
  }

  public subscribe(handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
    const mod = this.getModule();
    if (mod == null) {
      return () => {};
    }
    const subscription = mod.onMirroringEvent(handler);
    mod.flushPendingEvents().catch(() => {});
    return () => subscription.remove();
  }
}
