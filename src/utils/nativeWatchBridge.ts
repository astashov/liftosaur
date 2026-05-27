export type INativeWatchEvent = {
  type:
    | "watchStorageMerge"
    | "reloadStorageFromDisk"
    | "liveActivityStorage"
    | "updateLiveActivity"
    | "endWorkout"
    | "requestStorage"
    | "requestAuth"
    | "watchCrashReport";
  storage?: string;
  deviceId?: string;
  isLiveActivity?: boolean;
  forceUpdateEntryIndex?: boolean;
  data?: string;
};

export type INativeWatchAuth = {
  token: string;
  expiresAt: number;
  userId?: string;
};

export function NativeWatchBridge_isAvailable(): boolean {
  return false;
}

export function NativeWatchBridge_subscribeToWatchEvents(_handler: (event: INativeWatchEvent) => void): () => void {
  return () => {};
}

export function NativeWatchBridge_sendStorageToWatch(_filteredStorageJson: string): void {}

export function NativeWatchBridge_sendAuthToWatch(_auth: INativeWatchAuth): void {}

export function NativeWatchBridge_sendNoAuthToWatch(): void {}

export function NativeWatchBridge_sendClearAuthToWatch(): void {}

export function NativeWatchBridge_clearWatchStorage(): void {}

export function NativeWatchBridge_sendFinishWorkoutToWatch(): Promise<boolean> {
  return Promise.resolve(false);
}

export function NativeWatchBridge_sendDiscardWorkoutToWatch(): void {}

export function NativeWatchBridge_requestWatchLogs(): Promise<string> {
  return Promise.resolve("");
}

export function NativeWatchBridge_isWatchPaired(): boolean {
  return false;
}
