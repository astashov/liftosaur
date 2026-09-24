import { Platform } from "react-native";
import NativeLiftosaurWatch from "../specs/NativeLiftosaurWatch";
import { INativeWatchAuth, INativeWatchEvent, IWatchBridge } from "./watchBridge";

export type { INativeWatchAuth, INativeWatchEvent } from "./watchBridge";

export class WatchBridge implements IWatchBridge {
  public isAvailable(): boolean {
    return Platform.OS === "ios";
  }

  // Paired and installed, not reachable: a watch off the wrist still gets the storage through the
  // application context when it wakes. An iPhone with no watch at all should build no payload.
  public hasWatchApp(): boolean {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      return NativeLiftosaurWatch!.isWatchPaired() && NativeLiftosaurWatch!.isWatchAppInstalled();
    } catch (e) {
      return false;
    }
  }

  public subscribeToWatchEvents(handler: (event: INativeWatchEvent) => void): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }
    const subscription = NativeLiftosaurWatch!.onWatchEvent(handler);
    NativeLiftosaurWatch!.flushPendingEvents().catch(() => {});
    return () => subscription.remove();
  }

  public sendStorageToWatch(filteredStorageJson: string): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendStorageToWatch(filteredStorageJson).catch(() => {});
  }

  public sendAuthToWatch(auth: INativeWatchAuth): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendAuthToWatch(auth).catch(() => {});
  }

  public sendStorageAckToWatch(historyIds: string[]): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendStorageAckToWatch(historyIds).catch(() => {});
  }

  public sendNoAuthToWatch(): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendNoAuthToWatch().catch(() => {});
  }

  public sendClearAuthToWatch(): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendClearAuthToWatch().catch(() => {});
  }

  public clearWatchStorage(): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.clearWatchStorage().catch(() => {});
  }

  public sendFinishWorkoutToWatch(saveToHealth: boolean): Promise<boolean> {
    if (!this.isAvailable()) {
      return Promise.resolve(false);
    }
    return NativeLiftosaurWatch!.sendFinishWorkoutToWatch(saveToHealth).catch(() => false);
  }

  public sendDiscardWorkoutToWatch(): void {
    if (!this.isAvailable()) {
      return;
    }
    NativeLiftosaurWatch!.sendDiscardWorkoutToWatch().catch(() => {});
  }

  public requestWatchLogs(): Promise<string> {
    if (!this.isAvailable()) {
      return Promise.resolve("");
    }
    return NativeLiftosaurWatch!.requestWatchLogs().catch(() => "");
  }

  public isWatchPaired(): boolean {
    if (!this.isAvailable()) {
      return false;
    }
    return NativeLiftosaurWatch!.isWatchPaired();
  }
}
