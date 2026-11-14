import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import { Exercise_find, Exercise_get, Exercise_nameWithEquipment } from "./exercise";
import {
  History_totalRecordReps,
  History_totalRecordSets,
  History_totalRecordWeight,
  History_workoutTime,
} from "./history";
import { IFollowPermissions } from "./follow";
import { IReactionSummary } from "./reactions";

export type IFeedSet = Pick<
  ISet,
  | "vtype"
  | "index"
  | "id"
  | "reps"
  | "minReps"
  | "weight"
  | "originalWeight"
  | "rpe"
  | "logRpe"
  | "isAmrap"
  | "label"
  | "timer"
  | "setTimer"
  | "isOverflowSetTimer"
  | "auto"
  | "askWeight"
  | "isCompleted"
  | "isUnilateral"
  | "completedReps"
  | "completedRepsLeft"
  | "completedWeight"
  | "completedRpe"
  | "completedSetTimer"
  | "completedSetTimerLeft"
>;

export interface IFeedExercise {
  exerciseType?: IExerciseType;
  name: string;
  imageUrl?: string;
  superset?: string;
  sets: IFeedSet[];
  notes?: string;
}

export interface IFeedWorkoutStats {
  durationMs: number;
  volume: IWeight;
  sets: number;
  reps: number;
}

export interface IFeedWorkout {
  ownerId: string;
  recordId: number;
  date: string;
  startTime: number;
  endTime?: number;
  programName: string;
  dayName: string;
  notes?: string;
  stats: IFeedWorkoutStats;
  exercises: IFeedExercise[];
}

export interface IFeedOwner {
  nickname?: string;
}

export interface IFeedResponse {
  accountId: string;
  workouts: IFeedWorkout[];
  reactions: Partial<Record<string, IReactionSummary>>;
  owners: Partial<Record<string, IFeedOwner>>;
  cursor?: string;
  failedOwners: string[];
}

export function FeedWorkout_key(ownerId: string, recordId: number): string {
  return `${ownerId}:${recordId}`;
}

export function FeedWorkout_projectSet(set: ISet): IFeedSet {
  return {
    vtype: set.vtype,
    index: set.index,
    id: set.id,
    reps: set.reps,
    minReps: set.minReps,
    weight: set.weight,
    originalWeight: set.originalWeight,
    rpe: set.rpe,
    logRpe: set.logRpe,
    isAmrap: set.isAmrap,
    label: set.label,
    timer: set.timer,
    setTimer: set.setTimer,
    isOverflowSetTimer: set.isOverflowSetTimer,
    auto: set.auto,
    askWeight: set.askWeight,
    isCompleted: set.isCompleted,
    isUnilateral: set.isUnilateral,
    completedReps: set.completedReps,
    completedRepsLeft: set.completedRepsLeft,
    completedWeight: set.completedWeight,
    completedRpe: set.completedRpe,
    completedSetTimer: set.completedSetTimer,
    completedSetTimerLeft: set.completedSetTimerLeft,
  };
}

function projectEntry(entry: IHistoryEntry, ownerSettings: ISettings, permissions: IFollowPermissions): IFeedExercise {
  const exercise = Exercise_get(entry.exercise, ownerSettings.exercises);
  const isBuiltin = Exercise_find(entry.exercise, {}) != null;
  const custom = ownerSettings.exercises[entry.exercise.id];
  return {
    exerciseType: isBuiltin ? { id: entry.exercise.id, equipment: entry.exercise.equipment } : undefined,
    name: Exercise_nameWithEquipment(exercise, ownerSettings),
    imageUrl: isBuiltin ? undefined : custom?.smallImageUrl,
    superset: entry.superset,
    sets: entry.sets.map(FeedWorkout_projectSet),
    notes: permissions.notes ? entry.notes : undefined,
  };
}

export function FeedWorkout_fromRecord(
  record: IHistoryRecord,
  ownerSettings: ISettings,
  ownerId: string,
  permissions: IFollowPermissions
): IFeedWorkout {
  return {
    ownerId,
    recordId: record.id,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    programName: record.programName,
    dayName: record.dayName,
    notes: permissions.notes ? record.notes : undefined,
    stats: {
      durationMs: History_workoutTime(record),
      volume: History_totalRecordWeight(record, ownerSettings),
      sets: History_totalRecordSets(record),
      reps: History_totalRecordReps(record),
    },
    exercises: record.entries.map((entry) => projectEntry(entry, ownerSettings, permissions)),
  };
}
