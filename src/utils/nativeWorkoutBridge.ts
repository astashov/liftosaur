import { ILiveActivityState } from "./liveActivityManager";
import { SendMessage_toIosAndAndroid } from "./sendMessage";

export type INativeWorkoutBridgeLiveActivityAction = {
  action: "completeSet" | "addRestTime" | "skipRest" | "openApp";
  entryIndex?: number;
  setIndex?: number;
  addSeconds?: number;
};

export function NativeWorkoutBridge_pauseWorkout(): void {
  SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
}

export function NativeWorkoutBridge_resumeWorkout(opts: {
  reminder: number;
  isStart: boolean;
  hasSubscription: boolean;
}): void {
  SendMessage_toIosAndAndroid({
    type: "resumeWorkout",
    reminder: `${opts.reminder}`,
    isStart: opts.isStart ? "true" : "false",
    hasSubscription: opts.hasSubscription ? "true" : "false",
  });
}

export function NativeWorkoutBridge_finishWorkout(opts: {
  healthSync: boolean;
  calories: number;
  intervals: string;
}): void {
  SendMessage_toIosAndAndroid({
    type: "finishWorkout",
    healthSync: opts.healthSync ? "true" : "false",
    calories: `${opts.calories}`,
    intervals: opts.intervals,
  });
}

export function NativeWorkoutBridge_discardWorkout(): void {
  SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
  SendMessage_toIosAndAndroid({ type: "discardWorkout" });
}

export function NativeWorkoutBridge_updateLiveActivity(state: ILiveActivityState): void {
  SendMessage_toIosAndAndroid({ type: "updateLiveActivity", data: JSON.stringify(state) });
}

export function NativeWorkoutBridge_subscribeToLiveActivityActions(
  _handler: (event: INativeWorkoutBridgeLiveActivityAction) => void
): () => void {
  return () => {};
}
