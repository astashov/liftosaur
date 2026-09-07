import { Exercise_get, Exercise_fullName, Exercise_getIsUnilateral } from "./exercise";
import { UidFactory_generateUid } from "../utils/generator";
import { ExerciseImageUtils_url } from "./exerciseImage";
import type { IActiveSetTimer } from "./progress";
import { IHistoryRecord, ISet, ISettings, ITimedSetSide } from "../types";

export interface ITimedSetView {
  phaseId: string;
  entryIndex: number;
  setIndex: number;
  setId: string;
  stage: "getReady" | "work";
  side: ITimedSetSide;
  startedAt: number;
  getReadySeconds: number;
  targetSeconds: number;
  restSeconds: number;
  isOverflow: boolean;
  isCompleted: boolean;
  recordedThisSide: boolean;
  exerciseName: string;
  exerciseShortName: string;
  imageUrl?: string;
  currentSet: number;
  totalSets: number;
}

export function TimedSet_recordedFor(set: ISet, side: ITimedSetSide): number | undefined {
  return side === "left" ? set.completedSetTimerLeft : set.completedSetTimer;
}

export function TimedSet_withRecorded(set: ISet, side: ITimedSetSide, seconds: number): ISet {
  return side === "left" ? { ...set, completedSetTimerLeft: seconds } : { ...set, completedSetTimer: seconds };
}

export function TimedSet_sideToTime(set: ISet, isUnilateral: boolean): ITimedSetSide | undefined {
  if (!isUnilateral) {
    return set.completedSetTimer == null ? "bilateral" : undefined;
  }
  if (set.completedSetTimerLeft == null) {
    return "left";
  }
  return set.completedSetTimer == null ? "right" : undefined;
}

export interface ITimedSetPhaseFields {
  setTimer?: NonNullable<IHistoryRecord["setTimer"]>;
  setTimerGetReady?: NonNullable<IHistoryRecord["setTimerGetReady"]>;
}

export function TimedSet_open(
  progress: IHistoryRecord,
  entryIndex: number,
  setIndex: number,
  settings: ISettings,
  opts: { getReadySeconds: number; startedAt: number; nonce?: number }
): ITimedSetPhaseFields | undefined {
  const entry = progress.entries[entryIndex];
  const set = entry?.sets[setIndex];
  if (entry == null || set == null) {
    return undefined;
  }
  const side = TimedSet_sideToTime(set, Exercise_getIsUnilateral(entry.exercise, settings));
  if (side == null) {
    return undefined;
  }
  const identity = { entryIndex, setIndex, setId: set.id, id: UidFactory_generateUid(8), side };
  return opts.getReadySeconds > 0
    ? {
        setTimerGetReady: {
          ...identity,
          startedAt: opts.startedAt,
          getReady: opts.getReadySeconds,
          nonce: opts.nonce,
        },
      }
    : { setTimer: { ...identity, startedAt: opts.startedAt, nonce: opts.nonce } };
}

export function TimedSet_toView(
  progress: IHistoryRecord,
  phase: IActiveSetTimer | undefined,
  settings: ISettings
): ITimedSetView | undefined {
  if (phase == null || progress.amrapModal != null) {
    return undefined;
  }
  const entry = progress.entries[phase.entryIndex];
  const set = entry?.sets[phase.setIndex];
  if (entry == null || set == null) {
    return undefined;
  }
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  return {
    phaseId: phase.id,
    entryIndex: phase.entryIndex,
    setIndex: phase.setIndex,
    setId: phase.setId,
    stage: phase.phase,
    side: phase.side,
    startedAt: phase.startedAt,
    getReadySeconds: phase.phase === "getReady" ? phase.getReady : 0,
    targetSeconds: set.setTimer ?? 0,
    restSeconds: set.timer ?? 0,
    isOverflow: !!set.isOverflowSetTimer,
    isCompleted: !!set.isCompleted,
    recordedThisSide: TimedSet_recordedFor(set, phase.side) != null,
    exerciseName: Exercise_fullName(exercise, settings),
    exerciseShortName: exercise.name,
    imageUrl: ExerciseImageUtils_url(exercise, "small", settings),
    currentSet: entry.warmupSets.length + phase.setIndex + 1,
    totalSets: entry.warmupSets.length + entry.sets.length,
  };
}
