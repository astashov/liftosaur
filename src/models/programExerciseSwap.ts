import { IDayData, IExerciseType, IHistoryRecord, IPlannerProgram, ISettings } from "../types";
import { Progress_hasCompletedSetsForProgramExerciseId } from "./progress";
import { IPlannerProgramExercise, IPlannerProgramExerciseVariation } from "../pages/planner/models/types";
import {
  PlannerProgram_replaceExercise,
  PlannerProgram_thrownErrorMessage,
} from "../pages/planner/models/plannerProgram";
import { PlannerKey_fromFullName } from "../pages/planner/plannerKey";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { PlannerProgramExercise_shortNameFromFullName } from "../pages/planner/models/plannerProgramExercise";
import { Exercise_findByNameAndEquipment } from "./exercise";
import { EditProgramUiHelpers_changeAllInstances } from "../components/editProgram/editProgramUi/editProgramUiHelpers";

export type IProgramExerciseSwapScope = "one" | "all";

// The syntactic half of a name, produced by the editor's parser (LiftoEditorBrain). Kept as a
// structural type so the model layer doesn't depend on the editor.
export interface IProgramExerciseParsedName {
  fullName: string;
  start: number;
  end: number;
  usedNone: boolean;
  variations: { text: string; isCurrent: boolean }[];
}

export interface IProgramExerciseSwap {
  oldKey: string;
  newKey: string;
  oldFullName: string;
  newFullName: string;
  // Where the full name sits in the edited text, so the caller can put the old one back and
  // keep every other edit the user made in the same pass.
  start: number;
  end: number;
  // A ladder (`Squat | Front Squat`) is part of the exercise's identity and has to stay the
  // same on every instance, so it never takes the per-instance path.
  isLadder: boolean;
  label: string | undefined;
  variations: IPlannerProgramExerciseVariation[];
}

// The grammar has already separated the rungs and the `!` current marker; what is left is
// resolution against the exercise database, which is what needs settings.
function resolveVariations(
  parsed: IProgramExerciseParsedName,
  settings: ISettings
): { label: string | undefined; variations: IPlannerProgramExerciseVariation[] } {
  let label: string | undefined;
  const variations = parsed.variations.map((variation, index) => {
    const parts = PlannerExerciseEvaluator.extractNameParts(variation.text, settings.exercises);
    if (index === 0) {
      label = parts.label;
    }
    const exerciseType = Exercise_findByNameAndEquipment(
      PlannerProgramExercise_shortNameFromFullName(variation.text, settings),
      settings.exercises
    );
    return { exerciseType, name: parts.name, isCurrent: variation.isCurrent };
  });
  return { label, variations };
}

export interface IProgramExerciseIdentity {
  exerciseType: IExerciseType | undefined;
  label: string | undefined;
  templateName: string | undefined;
}

// Which exercise a blurb names *right now*, read from its text rather than from whatever the
// screen was opened on — a swap changes the name long before it reaches the program, and
// until then anything keyed off the old exercise (the picker's selection, equipment-aware
// weight stepping) is answering about an exercise that is no longer written down. Every field
// is always present so the result can overwrite a stale one by spreading.
export function ProgramExerciseSwap_identity(
  parsed: IProgramExerciseParsedName,
  settings: ISettings
): IProgramExerciseIdentity {
  const { label, variations } = resolveVariations(parsed, settings);
  const current = variations.find((v) => v.isCurrent) ?? variations[0];
  return {
    exerciseType: current?.exerciseType,
    label,
    templateName: current?.exerciseType == null ? current?.name : undefined,
  };
}

// Does this text still describe the same exercise the declaration is for? Answers with what
// changed when it doesn't, and with `undefined` when it does — including when the new name
// resolves to nothing, where the evaluator's own "Unknown exercise" is the better message.
export function ProgramExerciseSwap_detect(
  parsed: IProgramExerciseParsedName,
  declaration: IPlannerProgramExercise,
  settings: ISettings
): IProgramExerciseSwap | undefined {
  const newKey = PlannerKey_fromFullName(parsed.fullName, settings.exercises);
  if (newKey === declaration.key) {
    return undefined;
  }
  const { label, variations } = resolveVariations(parsed, settings);
  // A name with no exercise behind it only makes sense for a template: `used: none` on a name
  // that isn't a real exercise. That combination is the one thing that can never enter a
  // workout and never progresses, so it never de-reuses, and it is matched by name alone.
  // `used: none` on a *real* exercise is just a regular exercise kept out of the day — it
  // resolves like any other, and never reaches this check.
  // Judged on the edited text alone, never on what the declaration used to be: dropping
  // `used: none` while renaming is how a template stops being one, and reading the old value
  // would put it back.
  if (variations.some((v) => v.exerciseType == null) && !parsed.usedNone) {
    return undefined;
  }
  return {
    oldKey: declaration.key,
    newKey,
    oldFullName: declaration.fullName,
    newFullName: parsed.fullName,
    start: parsed.start,
    end: parsed.end,
    isLadder: variations.length > 1 || (declaration.exerciseVariations?.length ?? 0) > 1,
    label,
    variations,
  };
}

// The text with the swap taken back out: the user's other edits stay, the name goes back to
// what the program still has. Splicing this keeps the program valid (in particular every
// `...reuse` pointed at the old name), which is what lets the swap run as a program-level
// operation on top instead of as a text edit that breaks its own references.
export function ProgramExerciseSwap_revertedText(text: string, swap: IProgramExerciseSwap): string {
  return text.slice(0, swap.start) + swap.oldFullName + text.slice(swap.end);
}

// Ranges the evaluator reports against the reverted text, rebased onto the text the editor
// is actually showing.
export function ProgramExerciseSwap_rebaseRange(
  range: { from: number; to: number },
  swap: IProgramExerciseSwap
): { from: number; to: number } {
  const delta = swap.newFullName.length - swap.oldFullName.length;
  const shift = (offset: number): number => (offset >= swap.start + swap.oldFullName.length ? offset + delta : offset);
  return { from: shift(range.from), to: shift(range.to) };
}

export interface IProgramExerciseWorkoutRemap {
  oldKey: string;
  newKey: string;
  // Sets are already logged against this exercise, so converting them is the user's call.
  needsConfirmation: boolean;
}

// Whether an ongoing workout should follow a swap. It tracks the program by exercise key, so
// a swap that isn't carried over silently detaches the entry — but only the declaration the
// workout is actually following should move it. Asking merely whether the new key is on the
// workout's day is not enough: that exercise may have been sitting there all along, untouched
// by a swap that happened on another day, and remapping then points a live entry at an
// unrelated declaration. So the test is that the old exercise *left* this day and the new one
// took its place.
export function ProgramExerciseSwap_workoutRemap(
  progress: IHistoryRecord | undefined,
  programId: string,
  exercisesBeforeSwap: IPlannerProgramExercise[],
  exercisesAfterSwap: IPlannerProgramExercise[],
  oldKey: string,
  newKey: string | undefined
): IProgramExerciseWorkoutRemap | undefined {
  if (newKey == null || newKey === oldKey || progress == null || progress.programId !== programId) {
    return undefined;
  }
  const onWorkoutDay = (exercises: IPlannerProgramExercise[], key: string): boolean =>
    exercises.some((e) => e.key === key && e.dayData.day === progress.day);
  const replacedOnWorkoutDay =
    onWorkoutDay(exercisesBeforeSwap, oldKey) &&
    !onWorkoutDay(exercisesAfterSwap, oldKey) &&
    onWorkoutDay(exercisesAfterSwap, newKey);
  // Entries the user swapped by hand keep their own exercise, so they are not remappable and
  // must not make the workout look affected when they are all there is.
  const hasRemappableEntry = progress.entries.some((e) => e.programExerciseId === oldKey && !e.changed);
  if (!replacedOnWorkoutDay || !hasRemappableEntry) {
    return undefined;
  }
  return {
    oldKey,
    newKey,
    needsConfirmation: Progress_hasCompletedSetsForProgramExerciseId(progress, oldKey),
  };
}

// Applies the swap to the program itself, so reuse references follow the rename, ladders stay
// identical across instances, and a name that collides with another exercise gets de-conflicted.
export function ProgramExerciseSwap_apply(
  planner: IPlannerProgram,
  swap: IProgramExerciseSwap,
  scope: IProgramExerciseSwapScope,
  dayData: Required<IDayData>,
  settings: ISettings
): { planner: IPlannerProgram } | { error: string } {
  try {
    if (swap.isLadder) {
      return {
        planner: EditProgramUiHelpers_changeAllInstances(planner, swap.oldKey, settings, false, (exercise) => {
          // The rungs are identity and must match everywhere, but *which* rung an instance is
          // on is its own progression — overwriting that would quietly walk other weeks back
          // to the first rung. Only the edited instance takes the markers from the new text;
          // the rest keep theirs, as long as the ladder still has the same rungs to keep them on.
          const previous = exercise.exerciseVariations ?? [];
          const isEdited = exercise.dayData.week === dayData.week && exercise.dayData.dayInWeek === dayData.dayInWeek;
          const keepsOwnCurrent = !isEdited && previous.length === swap.variations.length;
          exercise.exerciseVariations = swap.variations.map((v, i) => ({
            ...v,
            isCurrent: keepsOwnCurrent ? (previous[i]?.isCurrent ?? v.isCurrent) : v.isCurrent,
          }));
          exercise.label = swap.label;
          // A lone rung serializes via exerciseType, so keep it aligned with this instance's current.
          const current = exercise.exerciseVariations.find((v) => v.isCurrent) ?? exercise.exerciseVariations[0];
          if (current?.exerciseType != null) {
            exercise.exerciseType = current.exerciseType;
          }
        }),
      };
    }
    const target: IExerciseType | string = swap.variations[0]?.exerciseType ?? swap.variations[0]?.name ?? "";
    return {
      planner: PlannerProgram_replaceExercise(
        planner,
        swap.oldKey,
        swap.label,
        target,
        settings,
        scope === "one" ? dayData : undefined
      ),
    };
  } catch (e) {
    // replaceExercise evaluates internally and throws syntax errors rather than returning them.
    return { error: PlannerProgram_thrownErrorMessage(e) };
  }
}
