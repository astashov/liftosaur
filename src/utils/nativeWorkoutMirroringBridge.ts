export type INativeWorkoutMirroringEvent = {
  type: "heartRate" | "stateChanged" | "ended" | "failed";
  heartRate?: number;
  isWatchWorkoutActive?: boolean;
  didStartWatchWorkout?: boolean;
  error?: string;
};

export function NativeWorkoutMirroring_startWatchWorkout(): Promise<boolean> {
  return Promise.resolve(false);
}

export function NativeWorkoutMirroring_pauseWatchWorkout(): void {}

export function NativeWorkoutMirroring_resumeWatchWorkout(): void {}

export function NativeWorkoutMirroring_endWatchWorkout(): void {}

export function NativeWorkoutMirroring_resetWatchWorkoutState(): void {}

export function NativeWorkoutMirroring_isHealthKitAvailable(): boolean {
  return false;
}

export function NativeWorkoutMirroring_subscribe(_handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
  return () => {};
}
