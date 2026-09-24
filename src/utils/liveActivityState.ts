import { ISetsStatus } from "../models/set";
import { ITimedSetSide } from "../types";

export interface ILiveActivitySet {
  status: ISetsStatus;
  isWarmup: boolean;
}

export interface ILiveActivityEntry {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  completedSets: ILiveActivitySet[];
  canCompleteFromLiveActivity: boolean;
  isWarmup: boolean;
  entryIndex: number;
  setIndex: number;

  exerciseImageUrl?: string;
  targetReps?: string;
  targetWeight?: string;
  targetRPE?: string;
  targetTimer?: string;
  plates?: string;
  currentWeight?: string;
  currentReps?: string;
  isSetTimer?: boolean;
}

export interface ILiveActivityRest {
  restTimerSince: number;
  restTimer: number;
  // Whether the resting set is part of an `auto` circuit (so the live activity shows "tap to update" when
  // the rest ends, to auto-advance to the next set's work timer). Non-auto rest just expires.
  isAuto: boolean;
}

export interface ILiveActivitySetTimer {
  setTimerSince: number;
  setTimer: number;
  isOverflow: boolean;
  isCompleted: boolean;
  entryIndex: number;
  setIndex: number;
  restTimer: number;
  phaseId: string;
  side: ITimedSetSide;
  recordedThisSide: boolean;
}

export interface ILiveActivityGetReady {
  getReadySince: number;
  getReady: number;
  entryIndex: number;
  setIndex: number;
  setTimer: number;
  phaseId: string;
  side: ITimedSetSide;
}

export interface ILiveActivityState {
  restTimer?: ILiveActivityRest;
  setTimer?: ILiveActivitySetTimer;
  getReady?: ILiveActivityGetReady;
  historyEntryState?: ILiveActivityEntry;
  workoutStartTimestamp: number;
  ignoreDoNotDisturb: boolean;
}
