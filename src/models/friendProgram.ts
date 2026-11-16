import {
  IExportedProgram,
  Program_daysRange,
  Program_evaluate,
  Program_exerciseRange,
  Program_getAllUsedProgramExercises,
  Program_weeksRange,
} from "./program";
import { IExerciseType, IProgram, ISettings } from "../types";
import { Exercise_toKey } from "./exercise";
import { CollectionUtils_compact } from "../utils/collection";

export interface IFriendProgramCard {
  id: string;
  name: string;
  isCurrent: boolean;
  exerciseTypes: IExerciseType[];
  summary: string;
}

export function FriendProgram_card(program: IProgram, settings: ISettings, isCurrent: boolean): IFriendProgramCard {
  const evaluated = Program_evaluate(program, settings);
  const exerciseTypes = new Map<string, IExerciseType>();
  for (const exercise of Program_getAllUsedProgramExercises(evaluated)) {
    if (exercise.exerciseType != null) {
      exerciseTypes.set(Exercise_toKey(exercise.exerciseType), exercise.exerciseType);
    }
  }
  const ranges = [Program_weeksRange(evaluated), Program_daysRange(evaluated), Program_exerciseRange(evaluated)];
  return {
    id: program.id,
    name: program.name,
    isCurrent,
    exerciseTypes: Array.from(exerciseTypes.values()),
    summary: CollectionUtils_compact(ranges).join(", "),
  };
}

export function FriendProgram_editorUrl(host: string, ownerId: string, programId: string): string {
  return `${host}/planner/friend/${encodeURIComponent(ownerId)}/${encodeURIComponent(programId)}`;
}

export function FriendProgram_previewSettings(viewer: ISettings, owner: ISettings): ISettings {
  return {
    ...viewer,
    units: owner.units,
    planner: owner.planner,
    timers: owner.timers,
    muscleGroups: owner.muscleGroups,
    exercises: { ...viewer.exercises, ...owner.exercises },
    exerciseData: owner.exerciseData,
  };
}

export interface IFriendProgramSummary {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface IFriendProgramContext {
  ownerId: string;
  exported: IExportedProgram;
  settings: ISettings;
  base: string;
}

export interface IProgramEditSummary {
  programId: string;
  programName: string;
  unseen: number;
  latest: { editorId: string; nickname?: string; createdAt: number };
}

export interface IProgramEditsResponse {
  accountId: string;
  unseenCount: number;
  programs: IProgramEditSummary[];
}

export interface IProgramEdit {
  id: string;
  programId: string;
  editorId: string;
  nickname?: string;
  createdAt: number;
  seen: boolean;
  before?: string;
  after?: string;
}

export interface IProgramEditsForProgram {
  accountId: string;
  programId: string;
  edits: IProgramEdit[];
}
