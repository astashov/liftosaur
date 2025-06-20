import { IUndoRedoState } from "../../builder/utils/undoredo";
import { IExerciseKind } from "../../../models/exercise";
import { IExerciseType, IPercentage, IProgram, IProgramState, IProgramStateMetadata } from "../../../types";
import { IPlannerSyntaxPointer, PlannerSyntaxError } from "../plannerExerciseEvaluator";
import { SyntaxNode } from "@lezer/common";
import {
  IDayData,
  IPlannerProgram,
  IPlannerSettings,
  IScreenMuscle,
  IWeight,
  IAllCustomExercises,
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

export type IPlannerProgramExerciseUsed = IPlannerProgramExercise &
  Required<Pick<IPlannerProgramExercise, "exerciseType">>;

export type IPlannerProgramExercise = {
  id: string;
  key: string;
  fullName: string;
  shortName: string;
  dayData: Required<IDayData>;
  exerciseType?: IExerciseType;
  label?: string;
  repeat: number[];
  repeating: number[];
  order: number;
  isRepeat?: boolean;
  text: string;
  tags: number[];
  equipment?: string;
  name: string;
  line: number;
  reuse?: IPlannerProgramReuse;
  notused?: boolean;
  evaluatedSetVariations: IPlannerProgramExerciseEvaluatedSetVariation[];
  setVariations: IPlannerProgramExerciseSetVariation[];
  warmupSets?: IPlannerProgramExerciseWarmupSet[];
  descriptions: IProgramExerciseDescriptions;
  globals: IPlannerProgramExerciseGlobals;
  progress?: IProgramExerciseProgress;
  update?: IProgramExerciseUpdate;
  points: {
    fullName: IPlannerSyntaxPointer;
    reuseSetPoint?: IPlannerSyntaxPointer;
    progressPoint?: IPlannerSyntaxPointer;
    updatePoint?: IPlannerSyntaxPointer;
    idPoint?: IPlannerSyntaxPointer;
    warmupPoint?: IPlannerSyntaxPointer;
  };
};

export interface IPlannerProgramExerciseSetVariation {
  sets: IPlannerProgramExerciseSet[];
  isCurrent: boolean;
}

export interface IPlannerProgramExerciseEvaluatedSetVariation {
  sets: IPlannerProgramExerciseEvaluatedSet[];
  isCurrent: boolean;
}

export interface IPlannerProgramExerciseEvaluatedSet {
  maxrep?: number;
  weight?: IWeight | IPercentage;
  minrep?: number;
  timer?: number;
  rpe?: number;
  logRpe: boolean;
  label?: string;
  isAmrap: boolean;
  isQuickAddSet: boolean;
  askWeight: boolean;
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

export type IPlannerProgramReuseSource = "specific" | "overall";

export interface IPlannerProgramReuse {
  fullName: string;
  source: IPlannerProgramReuseSource;
  week?: number;
  day?: number;
  exercise?: IPlannerProgramExercise;
}

export type IProgramExerciseProgressType = "custom" | "lp" | "dp" | "sum" | "none";
type IProgramExerciseUpdateType = "custom" | "lp" | "dp" | "sum";

export interface IProgramExerciseDescriptions {
  values: IPlannerProgramExerciseDescription[];
  reuse?: IPlannerProgramReuse;
}

export interface IProgramExerciseProgress {
  type: IProgramExerciseProgressType;
  state: IProgramState;
  stateMetadata: IProgramStateMetadata;
  script?: string;
  reuse?: IPlannerProgramReuse;
  liftoscriptNode?: SyntaxNode;
}

export interface IProgramExerciseUpdate {
  type: IProgramExerciseUpdateType;
  script?: string;
  reuse?: IPlannerProgramReuse;
  liftoscriptNode?: SyntaxNode;
  meta?: {
    stateKeys?: Set<string>;
  };
}

export interface IPlannerProgramProperty {
  name: string;
  fnName: string;
  fnArgs: string[];
  script?: string;
  body?: string;
  reuse?: IPlannerProgramProperty;
  liftoscriptNode?: SyntaxNode;
  exerciseType?: IExerciseType;
  exerciseLabel?: string;
  exerciseKey?: string;
  label?: string;
  meta?: {
    stateKeys?: Set<string>;
  };
}

export interface IPlannerProgramExerciseRepRange {
  numberOfSets: number;
  maxrep?: number;
  minrep?: number;
  isAmrap: boolean;
  isQuickAddSet: boolean;
}

export interface IPlannerUiFocusedDay {
  weekIndex: number;
  dayInWeekIndex: number;
}

export interface IPlannerUiFocusedExercise {
  weekIndex: number;
  dayIndex: number;
  exerciseLine: number;
}

export type IPlannerUiMode = "full" | "perday";

export interface IModalExerciseUi {
  focusedExercise: IPlannerUiFocusedExercise;
  types: IExerciseKind[];
  muscleGroups: IScreenMuscle[];
  exerciseType?: IExerciseType;
  exerciseKey?: string;
  fullName?: string;
  customExerciseName?: string;
  change?: "all" | "one" | "duplicate";
}

export interface IPlannerUi {
  focusedExercise?: IPlannerUiFocusedExercise;
  modalExercise?: IModalExerciseUi;
  exerciseUi: {
    edit: Set<string>;
    collapsed: Set<string>;
  };
  dayUi: {
    collapsed: Set<string>;
  };
  weekUi: {
    collapsed: Set<string>;
  };
  editExerciseModal?: {
    focusedExercise: IPlannerUiFocusedExercise;
    exerciseType?: IExerciseType;
    exerciseKey?: string;
    fullName?: string;
  };
  weekIndex: number;
  showPictureExport?: boolean;
  showWeekStats?: number;
  showDayStats?: number;
  showExerciseStats?: boolean;
  showPreview?: boolean;
  fullTextError?: PlannerSyntaxError;
  focusedDay?: IDayData & { key?: string };
  showSettingsModal?: boolean;
  tabIndex?: number;
  mode?: "reorder" | "ui" | "perday" | "full";
}

export interface IPlannerExerciseUiEditSetBottomSheet {
  exerciseKey: string;
  dayInWeekIndex: number;
  setVariationIndex: number;
  setIndex: number;
}

export interface IPlannerExerciseUi {
  modalExercise?: IModalExerciseUi;
  isProgressEnabled?: boolean;
  isUpdateEnabled?: boolean;
  showAddStateVariableModal?: boolean;
  showEditProgressScriptModal?: boolean;
  showEditUpdateScriptModal?: boolean;
  weekIndex: number;
  editSetBottomSheet?: IPlannerExerciseUiEditSetBottomSheet;
  modeTabIndex?: number;
  acrossWeeksTabIndex?: number;
}

export interface IPlannerFullText {
  text: string;
  currentLine?: number;
}

export interface IPlannerState extends IUndoRedoState<{ program: IProgram }> {
  id: string;
  ui: IPlannerUi;
  fulltext?: IPlannerFullText;
  initialEncodedProgram?: string;
  encodedProgram?: string;
}

export interface IPlannerExerciseState extends IUndoRedoState<{ program: IProgram }> {
  ui: IPlannerExerciseUi;
}

export interface IReuseCandidate {
  exercise: IPlannerProgramExercise;
  weekAndDays: Record<number, Set<number>>;
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
  timer: number;
}

export type IMuscleGroupSetSplit = { [key in IScreenMuscle]: ISetSplit };

export interface ISetResults {
  volume: IWeight;
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

export function focusedToStr(focused: IPlannerUiFocusedExercise): string {
  return JSON.stringify(focused);
}

export function focusedDayToStr(focused: IPlannerUiFocusedDay): string {
  return JSON.stringify(focused);
}

export function strToFocused(str: string): IPlannerUiFocusedExercise {
  return JSON.parse(str);
}
