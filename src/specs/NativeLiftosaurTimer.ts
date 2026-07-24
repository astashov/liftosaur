/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type LiftosaurTimerPermissionStatus = "granted" | "denied" | "unavailable";

export type LiftosaurTimerStartResult = {
  scheduled: boolean;
  missingPermission?: "notifications" | "exactAlarm" | "dndAccess";
};

export type LiftosaurTimerStartParams = {
  duration: number;
  title: string;
  subtitleHeader: string;
  subtitle: string;
  bodyHeader: string;
  body: string;
  volume: number;
  vibration: boolean;
  ignoreDoNotDisturb: boolean;
};

export type LiftosaurTimerFiredEvent = {
  reason: "expired" | "userTapped" | "userDismissed";
};

export interface Spec extends TurboModule {
  startTimer(params: LiftosaurTimerStartParams): Promise<LiftosaurTimerStartResult>;
  stopTimer(): Promise<void>;

  scheduleReminder(duration: number, title: string, body: string): Promise<LiftosaurTimerStartResult>;
  cancelReminder(): Promise<void>;

  playSound(volume: number, vibration: boolean, sound: string): Promise<void>;

  getNotificationPermission(): Promise<LiftosaurTimerPermissionStatus>;
  requestNotificationPermission(): Promise<LiftosaurTimerPermissionStatus>;

  getExactAlarmPermission(): Promise<LiftosaurTimerPermissionStatus>;
  requestExactAlarmPermission(): Promise<LiftosaurTimerPermissionStatus>;

  getDndAccessPermission(): Promise<LiftosaurTimerPermissionStatus>;
  requestDndAccessPermission(): Promise<LiftosaurTimerPermissionStatus>;

  readonly onTimerFired: EventEmitter<LiftosaurTimerFiredEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurTimer");
