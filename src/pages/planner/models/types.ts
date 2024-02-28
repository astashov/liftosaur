import { IUndoRedoState } from "../../builder/utils/undoredo";
import { IExerciseKind } from "../../../models/exercise";
import {
  IDayData,
  IPlannerProgram,
  IPlannerSettings,
  IScreenMuscle,
  IWeight,
  IAllCustomExercises,
  IAllEquipment,
} from "../../../types";

export interface IPlannerProgramExerciseDescription {
  value: string;
  isCurrent: boolean;
}

export interface IPlannerProgramExerciseGlobals {
  logRpe?: boolean;
  rpe?: number;
  timer?: number;
  percentage?: number;
  weight?: IWeight;
  askWeight?: boolean;
}

export interface IPlannerProgramExercise {
  label?: string;
  repeat: number[];
  text: string;
  equipment?: string;
  name: string;
  line: number;
  reuse?: IPlannerProgramReuse;
  notused?: boolean;
  sets: IPlannerProgramExerciseSet[];
  setVariations: IPlannerProgramExerciseSetVariation[];
  warmupSets?: IPlannerProgramExerciseWarmupSet[];
  skipProgress: { week: number; day: number }[];
  descriptions: IPlannerProgramExerciseDescription[];
  properties: IPlannerProgramProperty[];
  globals: IPlannerProgramExerciseGlobals;
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
  label?: string;
  askWeight?: boolean;
}

export interface IPlannerProgramExerciseWarmupSet {
  type: "warmup";
  numberOfSets: number;
  reps: number;
  percentage?: number;
  weight?: IWeight;
}

export interface IPlannerProgramReuse {
  exercise: string;
  week?: number;
  day?: number;
  sets?: IPlannerProgramExerciseSet[];
  globals?: IPlannerProgramExerciseGlobals;
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
  isQuickAddSet: boolean;
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
  editWeekDayModal?: { weekIndex: number; dayIndex?: number };
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
  id: string;
  ui: IPlannerUi;
  fulltext?: IPlannerFullText;
}

export interface IExportedPlannerProgram {
  type: "v2";
  version: string;
  id: string;
  program: IPlannerProgram;
  plannerSettings?: IPlannerSettings;
  settings: IPlannerMainSettings;
}

export interface IPlannerMainSettings {
  exercises: IAllCustomExercises;
  equipment: IAllEquipment;
  timer: number;
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
