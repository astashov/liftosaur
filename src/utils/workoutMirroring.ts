export type INativeWorkoutMirroringEvent = {
  type: "heartRate" | "stateChanged" | "ended" | "failed";
  heartRate?: number;
  isWatchWorkoutActive?: boolean;
  didStartWatchWorkout?: boolean;
  error?: string;
};

export interface IWorkoutMirroring {
  startWatchWorkout(): Promise<boolean>;
  pauseWatchWorkout(): void;
  resumeWatchWorkout(): void;
  endWatchWorkout(): void;
  resetWatchWorkoutState(): void;
  isHealthKitAvailable(): boolean;
  subscribe(handler: (event: INativeWorkoutMirroringEvent) => void): () => void;
}
