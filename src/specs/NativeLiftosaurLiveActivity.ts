/* eslint-disable @typescript-eslint/naming-convention */
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
  isSetTimer?: boolean;
};

export type LiveActivityRest = {
  restTimerSince: number;
  restTimer: number;
  isAuto: boolean;
};

export type LiveActivitySetTimer = {
  setTimerSince: number;
  setTimer: number;
  isOverflow: boolean;
  isCompleted: boolean;
  entryIndex: number;
  setIndex: number;
  // Rest (seconds) that follows the work timer. Lets native transition the activity to the rest view at
  // the threshold even when the app is backgrounded and JS can't run the auto-complete.
  restTimer: number;
};

export type LiveActivityGetReady = {
  getReadySince: number;
  getReady: number;
  entryIndex: number;
  setIndex: number;
  // Seconds of work that follow, so native can render "Next 0:45" and schedule the flip without JS.
  setTimer: number;
};

export type LiveActivityState = {
  workoutStartTimestamp: number;
  ignoreDoNotDisturb: boolean;
  rest?: LiveActivityRest;
  entry?: LiveActivityEntry;
  getReady?: LiveActivityGetReady;
  // Set only on the update that results from a "Complete Set" Live Activity tap,
  // so native can ack that exact render back to the waiting intent.
  completeSetRequestId?: string;
  setTimer?: LiveActivitySetTimer;
};

export type LiveActivityActionEvent = {
  action:
    | "completeSet"
    | "addRestTime"
    | "skipRest"
    | "openApp"
    | "recordSetTimer"
    | "checkSetTimer"
    | "startSetTimerWork";
  entryIndex?: number;
  setIndex?: number;
  addSeconds?: number;
  completeSetRequestId?: string;
  elapsedSeconds?: number;
  keepTiming?: boolean;
  // Captured natively, because JS may not handle this until long after the tap.
  tappedAt?: number;
  getReadySince?: number;
};

export interface Spec extends TurboModule {
  startLiveActivity(state: LiveActivityState): Promise<void>;
  updateLiveActivity(state: LiveActivityState): Promise<void>;
  endLiveActivity(): Promise<void>;
  isSupported(): boolean;
  flushPendingActions(): Promise<void>;

  readonly onLiveActivityAction: EventEmitter<LiveActivityActionEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurLiveActivity");
