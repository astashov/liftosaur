import { ILiveActivityState } from "./liveActivityState";

export type INativeWorkoutBridgeLiveActivityAction = {
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
  elapsedSeconds?: number;
  keepTiming?: boolean;
  tappedAt?: number;
  getReadySince?: number;
  completeSetRequestId?: string;
  phaseId?: string;
};

export interface IWorkoutBridge {
  pauseWorkout(): void;
  resumeWorkout(opts: { reminder: number; isStart: boolean; hasSubscription: boolean }): void;
  finishWorkout(opts: { healthSync: boolean; calories: number; intervals: string }): void;
  discardWorkout(): void;
  updateLiveActivity(state: ILiveActivityState): void;
  subscribeToLiveActivityActions(handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void;
  dispose(): void;
}
