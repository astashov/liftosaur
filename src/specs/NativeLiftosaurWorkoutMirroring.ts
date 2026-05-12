/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type WorkoutMirroringEvent = {
  type: "heartRate" | "stateChanged" | "ended" | "failed";
  heartRate?: number;
  isWatchWorkoutActive?: boolean;
  didStartWatchWorkout?: boolean;
  error?: string;
};

export interface Spec extends TurboModule {
  startWatchWorkout(): Promise<boolean>;
  pauseWatchWorkout(): Promise<void>;
  resumeWatchWorkout(): Promise<void>;
  endWatchWorkout(): Promise<void>;
  resetWatchWorkoutState(): Promise<void>;

  isHealthKitAvailable(): boolean;
  isWatchWorkoutActive(): boolean;
  didStartWatchWorkout(): boolean;

  flushPendingEvents(): Promise<void>;

  readonly onMirroringEvent: EventEmitter<WorkoutMirroringEvent>;
}

export default TurboModuleRegistry.get<Spec>("LiftosaurWorkoutMirroring");
