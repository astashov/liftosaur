import { IDayData, IPlannerProgram, IProgram, ISettings } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import {
  Program_evaluate,
  Program_evaluateCachedPlanner,
  Program_getAllProgramExercises,
  Program_getProgramExercise,
} from "./program";
import {
  ExerciseLiftoEditorDraft_create,
  ExerciseLiftoEditorDraft_fromEditor,
  ExerciseLiftoEditorDraft_pendingChange,
  IExerciseLiftoEditorDraft,
} from "./exerciseLiftoEditorDraft";
import {
  IProgramExerciseSharedSection,
  IProgramExerciseTextError,
  ProgramExerciseText_apply,
  ProgramExerciseText_blurb,
  ProgramExerciseText_findDeclaration,
  ProgramExerciseText_rebaseError,
  ProgramExerciseText_sharedSections,
} from "./programExerciseText";
import { IProgramExerciseSwap, IProgramExerciseSwapScope } from "./programExerciseSwap";
import {
  ProgramExercisePreview_apply,
  ProgramExercisePreview_materialize,
  ProgramExercisePreview_target,
} from "./programExercisePreview";
import { ProgramRewrite_changedKeys } from "./programRewrite";
import { PlannerProgram_generateFullText } from "../pages/planner/models/plannerProgram";

export type IExerciseDraftToProgramProgram = IProgram & { planner: IPlannerProgram };

// The exercise the sheet is on: the day it was opened from, and the instance chip pressed since.
export interface IExerciseDraftToProgramTarget {
  exerciseKey: string;
  day: number;
  selectedDayData: Required<IDayData> | undefined;
}

// Read off one evaluation of one planner, so a splice's target and its destination never disagree.
export interface IExerciseDraftToProgramSnapshot {
  program: IExerciseDraftToProgramProgram;
  instances: IPlannerProgramExercise[];
  declarationDayData: Required<IDayData>;
  currentExercise: IPlannerProgramExercise;
  declaration: IPlannerProgramExercise;
  sharedSections: IProgramExerciseSharedSection[];
  blurb: string;
  tappedDayData: Required<IDayData>;
  settings: ISettings;
}

export interface IExerciseDraftToProgramOptions {
  swapScope: IProgramExerciseSwapScope;
  detectSwap: (localBlurb: string, declaration: IPlannerProgramExercise) => IProgramExerciseSwap | undefined;
}

export interface IExerciseDraftToProgramApplied {
  swap: IProgramExerciseSwap | undefined;
  applied: ReturnType<typeof ProgramExerciseText_apply>;
}

export type IExerciseDraftToProgramPreview = { text: string } | { error: string };

export interface IExerciseDraftToProgramAnalysis {
  error?: IProgramExerciseTextError;
  preview?: IExerciseDraftToProgramPreview;
}

export type IExerciseDraftToProgramWritten =
  | { blurb: string; unchanged: true }
  | { blurb: string; unchanged: false; planner: IPlannerProgram; draft: IExerciseLiftoEditorDraft };

export function ExerciseDraftToProgram_snapshot(
  program: IExerciseDraftToProgramProgram,
  target: IExerciseDraftToProgramTarget,
  settings: ISettings
): IExerciseDraftToProgramSnapshot | undefined {
  const evaluated = Program_evaluateCachedPlanner(program, settings);
  const programExercise = Program_getProgramExercise(target.day, evaluated, target.exerciseKey);
  if (programExercise == null) {
    return undefined;
  }
  const instances = Program_getAllProgramExercises(evaluated).filter(
    (e) => e.key === target.exerciseKey && !e.isRepeat
  );
  const declarationDayData = ProgramExerciseText_findDeclaration(evaluated, programExercise).dayData;
  const activeDayData = target.selectedDayData ?? declarationDayData;
  const currentExercise = instances.find(
    (e) => e.dayData.week === activeDayData.week && e.dayData.dayInWeek === activeDayData.dayInWeek
  );
  if (currentExercise == null) {
    return undefined;
  }
  const declaration = ProgramExerciseText_findDeclaration(evaluated, currentExercise);
  return {
    program,
    instances,
    declarationDayData,
    currentExercise,
    declaration,
    sharedSections: ProgramExerciseText_sharedSections(evaluated, declaration),
    blurb: ProgramExerciseText_blurb(program.planner, declaration),
    tappedDayData: ProgramExercisePreview_target(declaration, programExercise, target.selectedDayData).tappedDayData,
    settings,
  };
}

// Folded up to the live text so a hidden shared edit is still validated, and with the swap
// applied so a renamed exercise's `...reuse` targets are not reported as broken.
export function ExerciseDraftToProgram_apply(
  snapshot: IExerciseDraftToProgramSnapshot,
  draft: IExerciseLiftoEditorDraft,
  text: string,
  options: IExerciseDraftToProgramOptions
): IExerciseDraftToProgramApplied | undefined {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const pending = ExerciseLiftoEditorDraft_pendingChange(
    ExerciseLiftoEditorDraft_fromEditor(draft, trimmed),
    snapshot.sharedSections
  );
  const localBlurb = pending.localBlurb.trim();
  if (localBlurb === "") {
    return undefined;
  }
  const swap = options.detectSwap(localBlurb, snapshot.declaration);
  return {
    swap,
    applied: ProgramExerciseText_apply(
      snapshot.program.planner,
      snapshot.declaration,
      localBlurb,
      pending.sharedEdits,
      swap,
      options.swapScope,
      snapshot.settings
    ),
  };
}

function keyAfterSwap(
  snapshot: IExerciseDraftToProgramSnapshot,
  result: IExerciseDraftToProgramApplied,
  planner: IPlannerProgram
): string {
  if (result.swap == null) {
    return snapshot.declaration.key;
  }
  return (
    ProgramRewrite_changedKeys(snapshot.program.planner, planner, snapshot.settings)[snapshot.declaration.key] ??
    snapshot.declaration.key
  );
}

export function ExerciseDraftToProgram_analyze(
  snapshot: IExerciseDraftToProgramSnapshot | undefined,
  draft: IExerciseLiftoEditorDraft,
  text: string,
  options: IExerciseDraftToProgramOptions,
  withPreview: boolean
): IExerciseDraftToProgramAnalysis {
  const result = snapshot != null ? ExerciseDraftToProgram_apply(snapshot, draft, text, options) : undefined;
  if (snapshot == null || result == null) {
    return { preview: withPreview ? { error: "There's nothing to resolve here yet." } : undefined };
  }
  if ("error" in result.applied) {
    // notFound means the sheet lost track of the exercise, not that the user typed something
    // wrong. The banner stays quiet and the save re-resolves from scratch.
    return {
      error: result.applied.notFound ? undefined : ProgramExerciseText_rebaseError(result.applied.error, text),
      preview: withPreview ? { error: result.applied.error.message } : undefined,
    };
  }
  if (!withPreview) {
    return {};
  }
  const resolved = ProgramExercisePreview_materialize(
    snapshot.program,
    result.applied.planner,
    snapshot.tappedDayData,
    keyAfterSwap(snapshot, result, result.applied.planner),
    snapshot.settings
  );
  return { preview: resolved != null ? { text: resolved } : { error: "Couldn't resolve this exercise." } };
}

export function ExerciseDraftToProgram_writePreview(
  snapshot: IExerciseDraftToProgramSnapshot,
  draft: IExerciseLiftoEditorDraft,
  panelText: string,
  options: IExerciseDraftToProgramOptions
): IExerciseDraftToProgramWritten | { error: IProgramExerciseTextError } {
  const folded = ExerciseDraftToProgram_apply(snapshot, draft, draft.localBlurb, options);
  if (folded == null) {
    return { error: { message: "There's nothing to write here yet." } };
  }
  if ("error" in folded.applied) {
    return { error: folded.applied.error };
  }
  const target = {
    key: keyAfterSwap(snapshot, folded, folded.applied.planner),
    dayData: snapshot.declaration.dayData,
    tappedDayData: snapshot.tappedDayData,
  };
  const result = ProgramExercisePreview_apply(folded.applied.planner, target, panelText, snapshot.settings);
  if ("error" in result) {
    return result;
  }
  if (
    PlannerProgram_generateFullText(result.planner.weeks) ===
    PlannerProgram_generateFullText(snapshot.program.planner.weeks)
  ) {
    return { blurb: result.blurb, unchanged: true };
  }
  const written = Program_evaluate({ ...snapshot.program, planner: result.planner }, snapshot.settings);
  const writtenDeclaration = Program_getAllProgramExercises(written).find(
    (e) =>
      e.key === target.key &&
      !e.isRepeat &&
      e.dayData.week === result.declarationDayData.week &&
      e.dayData.dayInWeek === result.declarationDayData.dayInWeek
  );
  return {
    blurb: result.blurb,
    unchanged: false,
    planner: result.planner,
    draft: ExerciseLiftoEditorDraft_create(
      result.blurb,
      writtenDeclaration != null
        ? ProgramExerciseText_sharedSections(written, writtenDeclaration)
        : snapshot.sharedSections
    ),
  };
}
