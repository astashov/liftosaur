import { Platform } from "react-native";
import NativeLiftosaurWatch, { WatchEvent, WatchAuth } from "../specs/NativeLiftosaurWatch";

export type INativeWatchEvent = WatchEvent;
export type INativeWatchAuth = WatchAuth;

export function NativeWatchBridge_isAvailable(): boolean {
  return Platform.OS === "ios";
}

export function NativeWatchBridge_subscribeToWatchEvents(handler: (event: WatchEvent) => void): () => void {
  if (Platform.OS !== "ios") {
    return () => {};
  }
  const subscription = NativeLiftosaurWatch!.onWatchEvent(handler);
  NativeLiftosaurWatch!.flushPendingEvents().catch(() => {});
  return () => subscription.remove();
}

export function NativeWatchBridge_sendStorageToWatch(filteredStorageJson: string): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.sendStorageToWatch(filteredStorageJson).catch(() => {});
}

export function NativeWatchBridge_sendAuthToWatch(auth: WatchAuth): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.sendAuthToWatch(auth).catch(() => {});
}

export function NativeWatchBridge_sendNoAuthToWatch(): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.sendNoAuthToWatch().catch(() => {});
}

export function NativeWatchBridge_sendClearAuthToWatch(): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.sendClearAuthToWatch().catch(() => {});
}

export function NativeWatchBridge_clearWatchStorage(): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.clearWatchStorage().catch(() => {});
}

export function NativeWatchBridge_sendFinishWorkoutToWatch(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return Promise.resolve(false);
  }
  return NativeLiftosaurWatch!.sendFinishWorkoutToWatch().catch(() => false);
}

export function NativeWatchBridge_sendDiscardWorkoutToWatch(): void {
  if (Platform.OS !== "ios") {
    return;
  }
  NativeLiftosaurWatch!.sendDiscardWorkoutToWatch().catch(() => {});
}

export function NativeWatchBridge_requestWatchLogs(): Promise<string> {
  if (Platform.OS !== "ios") {
    return Promise.resolve("");
  }
  return NativeLiftosaurWatch!.requestWatchLogs().catch(() => "");
}

export function NativeWatchBridge_isWatchPaired(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }
  return NativeLiftosaurWatch!.isWatchPaired();
}
