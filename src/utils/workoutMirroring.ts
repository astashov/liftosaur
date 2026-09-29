export type IHeartRateSource = "watch" | "phone";
export type IDesiredWorkoutStatus = "running" | "paused" | "none";

export interface IDesiredWorkout {
  workoutId: number | undefined;
  status: IDesiredWorkoutStatus;
  expectWatch: boolean;
}

export interface IRawWorkoutMirroringEvent {
  type: string;
  heartRate?: number;
  measuredAt?: number;
  source?: string;
}

export type INativeWorkoutMirroringEvent =
  | { type: "heartRate"; bpm: number; measuredAt: number; source: IHeartRateSource }
  | { type: "source"; source: IHeartRateSource | undefined };

export interface IWorkoutMirroring {
  setDesiredWorkout(desired: IDesiredWorkout): void;
  subscribe(handler: (event: INativeWorkoutMirroringEvent) => void): () => void;
}
