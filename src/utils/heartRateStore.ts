import {
  HeartRateReading_apply,
  HeartRateReading_expiresAt,
  HeartRateReading_visibleBpm,
  IHeartRateReading,
} from "../models/heartRateReading";
import { IWorkoutMirroring } from "./workoutMirroring";

export interface IHeartRateStore {
  getBpm(): number | undefined;
  subscribe(listener: () => void): () => void;
}

export class HeartRateStore implements IHeartRateStore {
  private reading: IHeartRateReading | undefined = undefined;
  private visibleBpm: number | undefined = undefined;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  private readonly listeners = new Set<() => void>();

  constructor(mirroring: IWorkoutMirroring) {
    mirroring.subscribe((event) => {
      const next = HeartRateReading_apply(this.reading, event);
      if (next !== this.reading) {
        this.reading = next;
        this.refresh();
        this.scheduleExpiry();
      }
    });
  }

  public getBpm = (): number | undefined => {
    return this.visibleBpm;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private refresh(): void {
    const visibleBpm = HeartRateReading_visibleBpm(this.reading, Date.now());
    if (visibleBpm !== this.visibleBpm) {
      this.visibleBpm = visibleBpm;
      for (const listener of this.listeners) {
        listener();
      }
    }
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    const expiresAt = HeartRateReading_expiresAt(this.reading);
    if (expiresAt != null) {
      this.expiryTimer = setTimeout(() => this.refresh(), Math.max(0, expiresAt - Date.now()));
    }
  }
}
