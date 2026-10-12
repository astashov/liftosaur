import { IHistoryRecord, IWorkoutOutcome } from "../types";

export interface IWatchHealthBinding {
  id?: number;
  missingSince?: number;
}

export type IWatchHealthDecision =
  | { type: "none" }
  | { type: "start"; binding: IWatchHealthBinding }
  | { type: "keep"; binding: IWatchHealthBinding }
  | { type: "end"; save: boolean; endTime?: number; reason: "finish" | "discard" | "missing" };

const missingWorkoutTimeoutMs = 30 * 60 * 1000;

export function WatchHealthDecision_decide(args: {
  progress: IHistoryRecord | undefined;
  outcomes: IWorkoutOutcome[];
  binding: IWatchHealthBinding | undefined;
  hasSession: boolean;
  nowMs: number;
}): IWatchHealthDecision {
  const { progress, outcomes, binding, hasSession, nowMs } = args;
  if (!hasSession) {
    return progress != null ? { type: "start", binding: { id: progress.startTime } } : { type: "none" };
  }
  const outcome = binding?.id != null ? outcomes.find((o) => o.id === binding.id) : undefined;
  if (outcome != null) {
    return outcome.outcome === "finish"
      ? { type: "end", save: outcome.healthSync, endTime: outcome.endTime, reason: "finish" }
      : { type: "end", save: false, reason: "discard" };
  }
  if (progress != null) {
    return { type: "keep", binding: { id: progress.startTime } };
  }
  const missingSince = binding?.missingSince ?? nowMs;
  if (nowMs - missingSince >= missingWorkoutTimeoutMs) {
    return { type: "end", save: false, reason: "missing" };
  }
  return { type: "keep", binding: { ...binding, missingSince } };
}
