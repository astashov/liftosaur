import { Platform } from "react-native";
import NativeLiftosaurWorkoutMirroring, { WorkoutMirroringEvent } from "../specs/NativeLiftosaurWorkoutMirroring";

export type INativeWorkoutMirroringEvent = WorkoutMirroringEvent;

function getModule(): typeof NativeLiftosaurWorkoutMirroring {
  if (Platform.OS !== "ios") {
    return null as unknown as typeof NativeLiftosaurWorkoutMirroring;
  }
  return NativeLiftosaurWorkoutMirroring;
}

export async function NativeWorkoutMirroring_startWatchWorkout(): Promise<boolean> {
  const mod = getModule();
  if (mod == null) return false;
  try {
    return await mod.startWatchWorkout();
  } catch (e) {
    console.warn("NativeWorkoutMirroring.startWatchWorkout failed", e);
    return false;
  }
}

export function NativeWorkoutMirroring_pauseWatchWorkout(): void {
  const mod = getModule();
  if (mod == null) return;
  mod.pauseWatchWorkout().catch(() => {});
}

export function NativeWorkoutMirroring_resumeWatchWorkout(): void {
  const mod = getModule();
  if (mod == null) return;
  mod.resumeWatchWorkout().catch(() => {});
}

export function NativeWorkoutMirroring_endWatchWorkout(): void {
  const mod = getModule();
  if (mod == null) return;
  mod.endWatchWorkout().catch(() => {});
}

export function NativeWorkoutMirroring_resetWatchWorkoutState(): void {
  const mod = getModule();
  if (mod == null) return;
  mod.resetWatchWorkoutState().catch(() => {});
}

export function NativeWorkoutMirroring_isHealthKitAvailable(): boolean {
  const mod = getModule();
  if (mod == null) return false;
  return mod.isHealthKitAvailable();
}

export function NativeWorkoutMirroring_subscribe(
  handler: (event: WorkoutMirroringEvent) => void
): () => void {
  const mod = getModule();
  if (mod == null) return () => {};
  const subscription = mod.onMirroringEvent(handler);
  mod.flushPendingEvents().catch(() => {});
  return () => subscription.remove();
}
