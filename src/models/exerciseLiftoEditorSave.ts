import { ILensRecordingPayload, lb } from "lens-shmens";
import { IHistoryRecord, ISettings } from "../types";
import { IState } from "./state";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_evaluateCachedPlanner,
  Program_getAllProgramExercises,
} from "./program";
import {
  ExerciseLiftoEditorDraft_isDirty,
  ExerciseLiftoEditorDraft_pendingChange,
  IExerciseLiftoEditorDraft,
} from "./exerciseLiftoEditorDraft";
import { IProgramExerciseSharedEdit, ProgramExerciseText_apply } from "./programExerciseText";
import {
  IProgramExerciseSwap,
  IProgramExerciseSwapScope,
  IProgramExerciseWorkoutRemap,
  ProgramExerciseSwap_scope,
  ProgramExerciseSwap_workoutRemap,
} from "./programExerciseSwap";
import { ProgramRewrite_changedKeys } from "./programRewrite";
import { Progress_lbProgress, Progress_remapProgramExerciseId } from "./progress";
import { CollectionUtils_setBy } from "../utils/collection";
import {
  ExerciseDraftToProgram_snapshot,
  IExerciseDraftToProgramProgram,
  IExerciseDraftToProgramTarget,
} from "./exerciseDraftToProgram";

export interface IExerciseLiftoEditorSaveInput {
  program: IExerciseDraftToProgramProgram | undefined;
  target: IExerciseDraftToProgramTarget | undefined;
  draft: IExerciseLiftoEditorDraft;
  hasPendingPlanner: boolean;
  isFromWorkout: boolean;
  hasEditorDraft: boolean;
  progress: IHistoryRecord | undefined;
  cachedScope: IProgramExerciseSwapScope | undefined;
  settings: ISettings;
  detectSwap: (localBlurb: string, declaration: IPlannerProgramExercise) => IProgramExerciseSwap | undefined;
}

export interface IExerciseLiftoEditorSavePrepared {
  program: IExerciseDraftToProgramProgram;
  saveEvaluated: IEvaluatedProgram;
  declaration: IPlannerProgramExercise;
  localBlurb: string;
  sharedEdits: IProgramExerciseSharedEdit[];
  swap: IProgramExerciseSwap | undefined;
  isFromWorkout: boolean;
  hasEditorDraft: boolean;
  progress: IHistoryRecord | undefined;
  settings: ISettings;
}

export interface IExerciseLiftoEditorSavePlan {
  updatedProgram: IExerciseDraftToProgramProgram;
  destination: "storage" | "editorDraft";
  mirrorToEditorDraft: boolean;
  remap: (IProgramExerciseWorkoutRemap & { question: string }) | undefined;
  labelNotice: string | undefined;
  description: string;
}

export type IExerciseLiftoEditorSaveDecision =
  | { kind: "close" }
  | { kind: "alert"; message: string; closes: boolean }
  | { kind: "askScope"; declarations: number; prepared: IExerciseLiftoEditorSavePrepared }
  | { kind: "write"; plan: IExerciseLiftoEditorSavePlan };

export function ExerciseLiftoEditorSave_decide(input: IExerciseLiftoEditorSaveInput): IExerciseLiftoEditorSaveDecision {
  if (!ExerciseLiftoEditorDraft_isDirty(input.draft) && !input.hasPendingPlanner) {
    return { kind: "close" };
  }
  // The program can be deleted, or removed by a sync, between the sheet opening and Save, and
  // writing this copy back would recreate it.
  if (input.program == null) {
    return {
      kind: "alert",
      message: "Couldn't find this program anymore, so the changes weren't saved.",
      closes: true,
    };
  }
  // Resolved on the program about to be written, not on a render's copy: a stacked sheet may
  // have moved which day declares the exercise or one of its shared sections. The sheet stays up
  // when it is gone: there is unsaved text on screen, and dismissing it is the one outcome that
  // loses it for good.
  const snapshot =
    input.target != null ? ExerciseDraftToProgram_snapshot(input.program, input.target, input.settings) : undefined;
  if (snapshot == null) {
    return {
      kind: "alert",
      message:
        "This exercise was changed somewhere else while you were editing it, so your changes weren't saved. Copy anything you want to keep, then close and reopen it.",
      closes: false,
    };
  }
  const saveEvaluated = Program_evaluateCachedPlanner(input.program, input.settings);
  const declaration = snapshot.declaration;
  const pending = ExerciseLiftoEditorDraft_pendingChange(input.draft, snapshot.sharedSections);
  const localBlurb = pending.localBlurb.trim();
  if (localBlurb === "") {
    return {
      kind: "alert",
      message: "The exercise text is empty. Delete the exercise from the program screen instead.",
      closes: false,
    };
  }
  const swap = input.detectSwap(localBlurb, declaration);
  const prepared: IExerciseLiftoEditorSavePrepared = {
    program: input.program,
    saveEvaluated,
    declaration,
    localBlurb,
    sharedEdits: pending.sharedEdits,
    swap,
    isFromWorkout: input.isFromWorkout,
    hasEditorDraft: input.hasEditorDraft,
    progress: input.progress,
    settings: input.settings,
  };
  if (swap == null) {
    return ExerciseLiftoEditorSave_withScope(prepared, "all");
  }
  const declarations = Math.max(snapshot.instances.length, 1);
  const scope = ProgramExerciseSwap_scope(swap.isLadder, declarations, input.cachedScope);
  if (scope === "ask") {
    return { kind: "askScope", declarations, prepared };
  }
  return ExerciseLiftoEditorSave_withScope(prepared, scope);
}

export type IExerciseLiftoEditorSaveScoped = Exclude<IExerciseLiftoEditorSaveDecision, { kind: "askScope" }>;

export function ExerciseLiftoEditorSave_withScope(
  prepared: IExerciseLiftoEditorSavePrepared,
  scope: IProgramExerciseSwapScope
): IExerciseLiftoEditorSaveScoped {
  const { program, declaration, swap, settings } = prepared;
  const applied = ProgramExerciseText_apply(
    program.planner,
    declaration,
    prepared.localBlurb,
    prepared.sharedEdits,
    swap,
    scope,
    settings
  );
  if ("error" in applied) {
    return { kind: "alert", message: applied.error.message, closes: false };
  }
  const updatedProgram = { ...program, planner: applied.planner };
  const newKey =
    swap != null ? ProgramRewrite_changedKeys(program.planner, applied.planner, settings)[declaration.key] : undefined;
  const updatedExercises =
    swap != null && newKey != null ? Program_getAllProgramExercises(Program_evaluate(updatedProgram, settings)) : [];
  const staysDraft = !prepared.isFromWorkout && prepared.hasEditorDraft;
  const remap = staysDraft
    ? undefined
    : ProgramExerciseSwap_workoutRemap(
        prepared.progress,
        updatedProgram.id,
        Program_getAllProgramExercises(prepared.saveEvaluated),
        updatedExercises,
        declaration.key,
        newKey
      );
  const label =
    swap != null && newKey != null && newKey !== swap.newKey
      ? updatedExercises.find((e) => e.key === newKey)?.label
      : undefined;
  return {
    kind: "write",
    plan: {
      updatedProgram,
      destination: staysDraft ? "editorDraft" : "storage",
      mirrorToEditorDraft: !staysDraft && prepared.hasEditorDraft,
      remap:
        remap != null
          ? {
              ...remap,
              question: `You've already logged sets for ${declaration.name} in this workout. Switch them to ${
                swap?.newFullName ?? "the new exercise"
              } too?`,
            }
          : undefined,
      labelNotice:
        label != null && swap != null
          ? `This program already has a ${swap.newFullName} somewhere else, so this one is labelled "${label}" to keep the two apart.`
          : undefined,
      description: staysDraft ? "Update program from edit exercise" : "Save program changes",
    },
  };
}

export function ExerciseLiftoEditorSave_lenses(
  plan: IExerciseLiftoEditorSavePlan,
  remapAccepted: boolean
): ILensRecordingPayload<IState>[] {
  const program = plan.updatedProgram;
  const editorDraftLens = lb<IState>().p("editProgramStates").p(program.id).p("current").p("program").record(program);
  if (plan.destination === "editorDraft") {
    return [editorDraftLens];
  }
  const lenses: ILensRecordingPayload<IState>[] = [
    lb<IState>()
      .p("storage")
      .p("programs")
      .recordModify((programs) => CollectionUtils_setBy(programs, "id", program.id, program)),
  ];
  if (plan.mirrorToEditorDraft) {
    lenses.push(editorDraftLens);
  }
  const remap = plan.remap;
  if (remap != null && remapAccepted) {
    lenses.push(
      Progress_lbProgress(0).recordModify((p) => Progress_remapProgramExerciseId(p, remap.oldKey, remap.newKey))
    );
  }
  return lenses;
}
