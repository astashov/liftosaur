import { INativeWatchAuth, INativeWatchEvent, IWatchBridge } from "./watchBridge";

export type { INativeWatchAuth, INativeWatchEvent } from "./watchBridge";

export class WatchBridge implements IWatchBridge {
  public isAvailable(): boolean {
    return false;
  }

  public hasWatchApp(): boolean {
    return false;
  }

  public subscribeToWatchEvents(_handler: (event: INativeWatchEvent) => void): () => void {
    return () => {};
  }

  public sendStorageToWatch(_filteredStorageJson: string): void {}

  public sendAuthToWatch(_auth: INativeWatchAuth): void {}

  public sendStorageAckToWatch(_historyIds: string[]): void {}

  public sendNoAuthToWatch(): void {}

  public sendClearAuthToWatch(): void {}

  public clearWatchStorage(): void {}

  public sendFinishWorkoutToWatch(_saveToHealth: boolean): Promise<boolean> {
    return Promise.resolve(false);
  }

  public sendDiscardWorkoutToWatch(): void {}

  public requestWatchLogs(): Promise<string> {
    return Promise.resolve("");
  }

  public isWatchPaired(): boolean {
    return false;
  }
}
