import { IScreenMuscle } from "../../../models/muscle";
import { IUndoRedoState } from "../../builder/utils/undoredo";
import { IExerciseKind } from "../../../models/exercise";
import { IAllCustomExercises, IUnit, IWeight } from "../../../types";

export interface IPlannerProgram {
  name: string;
  weeks: IPlannerProgramWeek[];
}

export interface IPlannerProgramWeek {
  name: string;
  days: IPlannerProgramDay[];
}

export interface IPlannerProgramDay {
  name: string;
  exerciseText: string;
}

export type IPlannerWeeklyRangeSets = { [key in IScreenMuscle]: [number, number] };
export type IPlannerWeeklyFrequency = { [key in IScreenMuscle]: number };

export interface IPlannerSettings {
  unit: IUnit;
  synergistMultiplier: number;
  strengthSetsPct: number;
  hypertrophySetsPct: number;
  weeklyRangeSets: IPlannerWeeklyRangeSets;
  weeklyFrequency: IPlannerWeeklyFrequency;
  restTimer: number;
  customExercises: IAllCustomExercises;
}

export interface IPlannerProgramExercise {
  label?: string;
  equipment?: string;
  name: string;
  line: number;
  sets: IPlannerProgramExerciseSet[];
  warmupSets?: IPlannerProgramExerciseWarmupSet[];
  description?: string;
  reuse?: boolean;
  properties: IPlannerProgramProperty[];
  globals: {
    logRpe?: boolean;
    rpe?: number;
    timer?: number;
    percentage?: number;
    weight?: IWeight;
  };
}

export interface IPlannerProgramExerciseSet {
  repRange?: IPlannerProgramExerciseRepRange;
  timer?: number;
  rpe?: number;
  logRpe?: boolean;
  percentage?: number;
  weight?: IWeight;
}

export interface IPlannerProgramExerciseWarmupSet {
  type: "warmup";
  numberOfSets: number;
  reps: number;
  percentage?: number;
  weight?: IWeight;
}

export interface IPlannerProgramProperty {
  name: string;
  fnName: string;
  fnArgs: string[];
}

export interface IPlannerProgramExerciseRepRange {
  numberOfSets: number;
  maxrep: number;
  minrep: number;
  isAmrap: boolean;
}

export interface IPlannerUiFocusedExercise {
  weekIndex: number;
  dayIndex: number;
  exerciseLine: number;
}

export interface IPlannerUi {
  focusedExercise?: IPlannerUiFocusedExercise;
  modalExercise?: {
    focusedExercise: IPlannerUiFocusedExercise;
    types: IExerciseKind[];
    muscleGroups: IScreenMuscle[];
    customExerciseName?: string;
  };
}

export interface IPlannerState extends IUndoRedoState<{ program: IPlannerProgram }> {
  ui: IPlannerUi;
  settings: IPlannerSettings;
}

export interface IExportedPlannerProgram {
  program: IPlannerProgram;
  settings: IPlannerSettings;
}

export type IMuscleGroupSetSplit = { [key in IScreenMuscle]: ISetSplit };

export interface ISetResults {
  total: number;
  strength: number;
  hypertrophy: number;
  upper: ISetSplit;
  lower: ISetSplit;
  core: ISetSplit;
  push: ISetSplit;
  pull: ISetSplit;
  legs: ISetSplit;
  muscleGroup: IMuscleGroupSetSplit;
}

export interface ISetSplit {
  strength: number;
  hypertrophy: number;
  exercises: {
    dayIndex: number;
    exerciseName: string;
    isSynergist: boolean;
    strengthSets: number;
    hypertrophySets: number;
  }[];
  frequency: Partial<Record<number, true>>;
}
