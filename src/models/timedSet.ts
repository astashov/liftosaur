import { Exercise_get, Exercise_fullName, Exercise_getIsUnilateral } from "./exercise";
import { UidFactory_generateUid } from "../utils/generator";
import { ExerciseImageUtils_url } from "./exerciseImage";
import type { IActiveSetTimer } from "./progress";
import { IHistoryRecord, ISet, ISettings, ITimedSetSide } from "../types";

// What every surface outside the model renders a running timed set from: the phone banner, the watch
// modal, the two Live Activity payloads and the Android live update. Built once so `side` and
// `recordedThisSide` are decided in one place rather than four.
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
  // Whether the side now being timed already has a duration on it. What swaps the primary button to
  // "Next side", and on a bilateral set what hides the record buttons.
  recordedThisSide: boolean;
  // The watch shows the bare name; every other surface shows it with equipment.
  exerciseName: string;
  exerciseShortName: string;
  imageUrl?: string;
  // 1-based across warmups and work sets, so a timed set after warmups reads "4/5" and not "2/3".
  currentSet: number;
  totalSets: number;
}

export function TimedSet_recordedFor(set: ISet, side: ITimedSetSide): number | undefined {
  return side === "left" ? set.completedSetTimerLeft : set.completedSetTimer;
}

export function TimedSet_withRecorded(set: ISet, side: ITimedSetSide, seconds: number): ISet {
  return side === "left" ? { ...set, completedSetTimerLeft: seconds } : { ...set, completedSetTimer: seconds };
}

// The only thing that decides which half a clock opens on. Reading the resolved side's field rather than
// `completedSetTimer` is what lets a record with only a right duration be timed at all: that field is the
// right half on a unilateral set, so a guard on it alone leaves such a record permanently untimeable.
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

// The one way to open a clock. Three callers open one — tapping play, an `auto` circuit advancing to the
// next set, and a unilateral set handing off to its other side — and they differ only in which set, how
// many countdown seconds, and when the phase starts. Resolving the side, carrying `setId` and minting `id`
// is the same work every time, and inlining it per caller is how the auto-advance path came to hardcode
// "bilateral": one clock ran for both legs, showed no side, and recorded only the right.
//
// Returns undefined when there is nothing left to time on that set, so a caller cannot open an empty phase.
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

// Takes the resolved phase rather than resolving it, so this module imports nothing from progress.ts at
// runtime and TimedSet_sideToTime keeps exactly one importer.
export function TimedSet_toView(
  progress: IHistoryRecord,
  phase: IActiveSetTimer | undefined,
  settings: ISettings
): ITimedSetView | undefined {
  // A timed AMRAP set keeps its clock open behind the amrap modal, and every surface yields to that
  // modal rather than drawing the clock under it.
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
