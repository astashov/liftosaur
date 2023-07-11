import { IScreenMuscle } from "../../../models/muscle";
import { IUndoRedoState } from "../../builder/utils/undoredo";
import { IExerciseKind } from "../../../models/exercise";

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
  strengthSetsPct: number;
  hypertrophySetsPct: number;
  weeklyRangeSets: IPlannerWeeklyRangeSets;
  weeklyFrequency: IPlannerWeeklyFrequency;
  restTimer: number;
}

export interface IPlannerProgramExercise {
  name: string;
  line: number;
  sets: IPlannerProgramExerciseSet[];
  globals: {
    timer?: number;
    rpe?: number;
  };
}

export interface IPlannerProgramExerciseSet {
  repRange?: IPlannerProgramExerciseRepRange;
  timer?: number;
  rpe?: number;
}

export interface IPlannerProgramExerciseRepRange {
  numberOfSets: number;
  maxrep: number;
  minrep: number;
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
  frequency: Partial<Record<number, true>>;
}
