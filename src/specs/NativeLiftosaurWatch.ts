/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type WatchEvent = {
  type:
    | "watchStorageMerge"
    | "reloadStorageFromDisk"
    | "liveActivityStorage"
    | "updateLiveActivity"
    | "endWorkout"
    | "syncRestTimer"
    | "stopRestTimer"
    | "requestStorage"
    | "requestAuth"
    | "watchCrashReport";

  storage?: string;
  deviceId?: string;
  isLiveActivity?: boolean;
  forceUpdateEntryIndex?: boolean;

  data?: string;

  restTimerSince?: number;
  restTimer?: number;

  crashType?: string;
  lastBreadcrumb?: string;
  breadcrumbs?: string;
  exceptionInfo?: string;
  deviceModel?: string;
  watchOSVersion?: string;
  bundleVersion?: string;
  lastLogs?: string;
};

export type WatchAuth = {
  token: string;
  expiresAt: number;
  userId?: string;
};

export interface Spec extends TurboModule {
  sendStorageToWatch(filteredStorageJson: string): Promise<void>;
  sendAuthToWatch(auth: WatchAuth): Promise<void>;
  sendNoAuthToWatch(): Promise<void>;
  sendClearAuthToWatch(): Promise<void>;
  clearWatchStorage(): Promise<void>;
  sendFinishWorkoutToWatch(): Promise<boolean>;
  sendDiscardWorkoutToWatch(): Promise<void>;
  requestWatchLogs(): Promise<string>;

  isWatchPaired(): boolean;
  isWatchAppInstalled(): boolean;
  isWatchReachable(): boolean;

  flushPendingEvents(): Promise<void>;

  readonly onWatchEvent: EventEmitter<WatchEvent>;
}

export default TurboModuleRegistry.get<Spec>("LiftosaurWatch");
