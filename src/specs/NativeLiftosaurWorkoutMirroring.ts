/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type WorkoutMirroringEvent = {
  type: string;
  heartRate?: number;
  measuredAt?: number;
  source?: string;
};

export interface Spec extends TurboModule {
  setDesiredWorkout(workoutId: number, status: string, expectWatch: boolean): void;


  flushPendingEvents(): Promise<void>;

  readonly onMirroringEvent: EventEmitter<WorkoutMirroringEvent>;
}

export default TurboModuleRegistry.get<Spec>("LiftosaurWorkoutMirroring");
