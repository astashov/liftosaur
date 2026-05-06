import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type LiveActivitySetStatus = "success" | "completed" | "in-range" | "failed" | "not-finished" | "not-started";

export type LiveActivityCompletedSet = {
  status: LiveActivitySetStatus;
  isWarmup: boolean;
};

export type LiveActivityEntry = {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  completedSets: LiveActivityCompletedSet[];
  canCompleteFromLiveActivity: boolean;
  isWarmup: boolean;
  entryIndex: number;
  setIndex: number;

  exerciseImageUrl?: string;
  targetReps?: string;
  targetWeight?: string;
  targetRPE?: string;
  targetTimer?: string;
  plates?: string;
  currentWeight?: string;
  currentReps?: string;
};

export type LiveActivityRest = {
  restTimerSince: number;
  restTimer: number;
};

export type LiveActivityState = {
  workoutStartTimestamp: number;
  ignoreDoNotDisturb: boolean;
  rest?: LiveActivityRest;
  entry?: LiveActivityEntry;
};

export type LiveActivityActionEvent = {
  action: "completeSet" | "addRestTime" | "skipRest" | "openApp";
  entryIndex?: number;
  setIndex?: number;
  addSeconds?: number;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  startLiveActivity(state: LiveActivityState): Promise<void>;
  updateLiveActivity(state: LiveActivityState): Promise<void>;
  endLiveActivity(): Promise<void>;
  isSupported(): boolean;

  readonly onLiveActivityAction: EventEmitter<LiveActivityActionEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurLiveActivity");
