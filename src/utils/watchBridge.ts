export type INativeWatchEvent = {
  type:
    | "watchStorageMerge"
    | "reloadStorageFromDisk"
    | "liveActivityStorage"
    | "endWorkout"
    | "requestStorage"
    | "requestAuth"
    | "watchCrashReport";
  storage?: string;
  deviceId?: string;
  isLiveActivity?: boolean;
  forceUpdateEntryIndex?: boolean;
  data?: string;
  crashType?: string;
  lastBreadcrumb?: string;
  breadcrumbs?: string;
  exceptionInfo?: string;
  deviceModel?: string;
  watchOSVersion?: string;
  bundleVersion?: string;
  lastLogs?: string;
};

export type INativeWatchAuth = {
  token: string;
  expiresAt: number;
  userId?: string;
};

export interface IWatchBridge {
  isAvailable(): boolean;
  hasWatchApp(): boolean;
  subscribeToWatchEvents(handler: (event: INativeWatchEvent) => void): () => void;
  sendStorageToWatch(filteredStorageJson: string): void;
  sendAuthToWatch(auth: INativeWatchAuth): void;
  sendStorageAckToWatch(historyIds: string[]): void;
  sendNoAuthToWatch(): void;
  sendClearAuthToWatch(): void;
  clearWatchStorage(): void;
  sendFinishWorkoutToWatch(saveToHealth: boolean): Promise<boolean>;
  sendDiscardWorkoutToWatch(): void;
  requestWatchLogs(): Promise<string>;
  isWatchPaired(): boolean;
}
