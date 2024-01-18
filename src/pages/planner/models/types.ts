import { IUndoRedoState } from "../../builder/utils/undoredo";
import { IExerciseKind } from "../../../models/exercise";
import { IDayData, IPlannerProgram, IPlannerSettings, IScreenMuscle, IWeight } from "../../../types";

export interface IPlannerProgramExercise {
  label?: string;
  equipment?: string;
  name: string;
  line: number;
  sets: IPlannerProgramExerciseSet[];
  setVariations: IPlannerProgramExerciseSetVariation[];
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

export interface IPlannerProgramExerciseSetVariation {
  sets: IPlannerProgramExerciseSet[];
  isCurrent: boolean;
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
  script?: string;
  body?: string;
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

export type IPlannerUiMode = "full" | "perday";

export interface IPlannerUi {
  focusedExercise?: IPlannerUiFocusedExercise;
  modalExercise?: {
    focusedExercise: IPlannerUiFocusedExercise;
    types: IExerciseKind[];
    muscleGroups: IScreenMuscle[];
    customExerciseName?: string;
  };
  editDayModal?: { weekIndex: number; dayIndex: number };
  weekIndex: number;
  subscreen?: "weeks" | "full";
  showWeekStats?: boolean;
  showDayStats?: boolean;
  showExerciseStats?: boolean;
  showPreview?: boolean;
  focusedDay?: IDayData;
  showSettingsModal?: boolean;
}

export interface IPlannerFullText {
  text: string;
  currentLine?: number;
}

export interface IPlannerState extends IUndoRedoState<{ program: IPlannerProgram }> {
  ui: IPlannerUi;
  fulltext?: IPlannerFullText;
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
