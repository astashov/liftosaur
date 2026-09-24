import { ILiveActivityState } from "../../src/utils/liveActivityState";
import { INativeTimerStartParams, ITimerBridge } from "../../src/utils/timerBridge";
import { INativeWatchAuth, INativeWatchEvent, IWatchBridge } from "../../src/utils/watchBridge";
import { IAuthToken, IKeychain } from "../../src/utils/keychain";
import { INativeWorkoutBridgeLiveActivityAction, IWorkoutBridge } from "../../src/utils/workoutBridge";
import { INativeWorkoutMirroringEvent, IWorkoutMirroring } from "../../src/utils/workoutMirroring";

export type IMockBridgeCall = { bridge: string; method: string; args: unknown[] };

export class MockBridgeLog {
  public calls: IMockBridgeCall[] = [];

  public record(bridge: string, method: string, ...args: unknown[]): void {
    this.calls.push({ bridge, method, args });
  }

  public names(): string[] {
    return this.calls.map((c) => `${c.bridge}.${c.method}`);
  }

  public reset(): void {
    this.calls = [];
  }
}

export class MockTimerBridge implements ITimerBridge {
  private readonly scheduledHandlers = new Set<() => void>();

  constructor(private readonly log: MockBridgeLog) {}

  public startTimer(params: INativeTimerStartParams): void {
    this.log.record("timer", "startTimer", params);
    Promise.resolve().then(() => this.scheduledHandlers.forEach((h) => h()));
  }

  public stopTimer(): void {
    this.log.record("timer", "stopTimer");
  }

  public playSound(volume: number, vibration: boolean, sound: string): boolean {
    this.log.record("timer", "playSound", volume, vibration, sound);
    return true;
  }

  public subscribeOnScheduled(handler: () => void): () => void {
    this.scheduledHandlers.add(handler);
    return () => {
      this.scheduledHandlers.delete(handler);
    };
  }

  public scheduleReminder(duration: number, title: string, body: string): void {
    this.log.record("timer", "scheduleReminder", duration, title, body);
  }

  public cancelReminder(): void {
    this.log.record("timer", "cancelReminder");
  }
}

export type IMockLiveActivityPayload = ILiveActivityState & { completeSetRequestId?: string };

export class MockWorkoutBridge implements IWorkoutBridge {
  public liveActivityStates: IMockLiveActivityPayload[] = [];
  private handler: ((event: INativeWorkoutBridgeLiveActivityAction) => void) | undefined = undefined;
  private pendingCompleteSetRequestId: string | null = null;

  constructor(private readonly log: MockBridgeLog) {}

  public pauseWorkout(): void {
    this.log.record("workout", "pauseWorkout");
  }

  public resumeWorkout(opts: { reminder: number; isStart: boolean; hasSubscription: boolean }): void {
    this.log.record("workout", "resumeWorkout", opts);
  }

  public finishWorkout(opts: { healthSync: boolean; calories: number; intervals: string }): void {
    this.log.record("workout", "finishWorkout", opts);
  }

  public discardWorkout(): void {
    this.log.record("workout", "discardWorkout");
  }

  public updateLiveActivity(state: ILiveActivityState): void {
    const payload = { ...state, completeSetRequestId: this.pendingCompleteSetRequestId ?? undefined };
    this.log.record("workout", "updateLiveActivity", payload);
    this.liveActivityStates.push(payload);
  }

  public subscribeToLiveActivityActions(handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = undefined;
    };
  }

  public emitLiveActivityAction(event: INativeWorkoutBridgeLiveActivityAction): void {
    if (
      (event.action === "completeSet" || event.action === "recordSetTimer" || event.action === "startSetTimerWork") &&
      event.completeSetRequestId != null
    ) {
      this.pendingCompleteSetRequestId = event.completeSetRequestId;
    }
    try {
      this.handler?.(event);
    } finally {
      this.pendingCompleteSetRequestId = null;
    }
  }

  public dispose(): void {
    this.log.record("workout", "dispose");
  }
}

export class MockWatchBridge implements IWatchBridge {
  public finishWorkoutResult: boolean = false;
  public watchAppInstalled: boolean = true;
  private handler: ((event: INativeWatchEvent) => void) | undefined = undefined;

  constructor(private readonly log: MockBridgeLog) {}

  public isAvailable(): boolean {
    return true;
  }

  public hasWatchApp(): boolean {
    return this.watchAppInstalled;
  }

  public subscribeToWatchEvents(handler: (event: INativeWatchEvent) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = undefined;
    };
  }

  public emitWatchEvent(event: INativeWatchEvent): void {
    this.handler?.(event);
  }

  public sendStorageToWatch(filteredStorageJson: string): void {
    this.log.record("watch", "sendStorageToWatch", filteredStorageJson);
  }

  public sendAuthToWatch(auth: INativeWatchAuth): void {
    this.log.record("watch", "sendAuthToWatch", auth);
  }

  public sendStorageAckToWatch(historyIds: string[]): void {
    this.log.record("watch", "sendStorageAckToWatch", historyIds);
  }

  public sendNoAuthToWatch(): void {
    this.log.record("watch", "sendNoAuthToWatch");
  }

  public sendClearAuthToWatch(): void {
    this.log.record("watch", "sendClearAuthToWatch");
  }

  public clearWatchStorage(): void {
    this.log.record("watch", "clearWatchStorage");
  }

  public async sendFinishWorkoutToWatch(saveToHealth: boolean): Promise<boolean> {
    this.log.record("watch", "sendFinishWorkoutToWatch", saveToHealth);
    return this.finishWorkoutResult;
  }

  public sendDiscardWorkoutToWatch(): void {
    this.log.record("watch", "sendDiscardWorkoutToWatch");
  }

  public async requestWatchLogs(): Promise<string> {
    return "";
  }

  public isWatchPaired(): boolean {
    return true;
  }
}

export class MockWorkoutMirroring implements IWorkoutMirroring {
  public startResult: boolean = true;
  private handler: ((event: INativeWorkoutMirroringEvent) => void) | undefined = undefined;

  constructor(private readonly log: MockBridgeLog) {}

  public async startWatchWorkout(): Promise<boolean> {
    this.log.record("mirroring", "startWatchWorkout");
    return this.startResult;
  }

  public pauseWatchWorkout(): void {
    this.log.record("mirroring", "pauseWatchWorkout");
  }

  public resumeWatchWorkout(): void {
    this.log.record("mirroring", "resumeWatchWorkout");
  }

  public endWatchWorkout(): void {
    this.log.record("mirroring", "endWatchWorkout");
  }

  public resetWatchWorkoutState(): void {
    this.log.record("mirroring", "resetWatchWorkoutState");
  }

  public isHealthKitAvailable(): boolean {
    return true;
  }

  public subscribe(handler: (event: INativeWorkoutMirroringEvent) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = undefined;
    };
  }

  public emitMirroringEvent(event: INativeWorkoutMirroringEvent): void {
    this.handler?.(event);
  }
}

export class MockKeychain implements IKeychain {
  public token: IAuthToken | undefined = undefined;

  constructor(private readonly log: MockBridgeLog) {}

  public async setAuthToken(auth: IAuthToken): Promise<void> {
    this.log.record("keychain", "setAuthToken", auth);
    this.token = auth;
  }

  public async getAuthToken(): Promise<IAuthToken | undefined> {
    return this.token;
  }

  public async clearAuthToken(): Promise<void> {
    this.log.record("keychain", "clearAuthToken");
    this.token = undefined;
  }
}

export function MockBridges_build(): {
  log: MockBridgeLog;
  timer: MockTimerBridge;
  workout: MockWorkoutBridge;
  watch: MockWatchBridge;
  mirroring: MockWorkoutMirroring;
  keychain: MockKeychain;
} {
  const log = new MockBridgeLog();
  return {
    log,
    timer: new MockTimerBridge(log),
    workout: new MockWorkoutBridge(log),
    watch: new MockWatchBridge(log),
    mirroring: new MockWorkoutMirroring(log),
    keychain: new MockKeychain(log),
  };
}
