import {
  IProgramExerciseSharedEdit,
  IProgramExerciseSharedSection,
  ProgramExerciseText_compose,
  ProgramExerciseText_split,
} from "./programExerciseText";

// What the editor sheet will save, kept apart from whatever text the editor happens to be
// mounted with. The two used to be the same value, which stopped being true once showing the
// shared sections started remounting the editor with recomposed text: that text is derived from
// a possibly-dirty draft, so measuring "has anything changed" against it always said no.
//
// The draft carries its own baselines — `originalLocalBlurb` and `baseline` are both captured
// when the sheet opens and never move. Nothing that answers "did this change?" takes them as an
// argument, so no caller can supply a different one and get a different answer.
export interface IExerciseLiftoEditorDraft {
  // "Blurb" is the unit this sheet edits: the exercise's own line plus the `//` description
  // lines above it that the evaluator attaches to it. "Local" is the other axis — this
  // declaration's own text, as opposed to the shared properties below, which are written on
  // another day's line and only spliced in on request.
  originalLocalBlurb: string;
  localBlurb: string;
  // The shared sections as they were when the sheet opened.
  baseline: IProgramExerciseSharedSection[];
  // Only properties whose text actually differs from `baseline`. An untouched property is
  // absent, so it can never be written back over a value someone else changed meanwhile.
  sharedEdits: Record<string, string>;
}

export function ExerciseLiftoEditorDraft_create(
  originalLocalBlurb: string,
  baseline: IProgramExerciseSharedSection[]
): IExerciseLiftoEditorDraft {
  return { originalLocalBlurb, localBlurb: originalLocalBlurb, baseline, sharedEdits: {} };
}

// Folds the editor's current document in. Shared sections that aren't in the text are hidden,
// not deleted, so they keep whatever the draft already recorded. A section edited back to its
// baseline drops out again, which is what lets the sheet go clean.
export function ExerciseLiftoEditorDraft_fromEditor(
  draft: IExerciseLiftoEditorDraft,
  text: string
): IExerciseLiftoEditorDraft {
  const split = ProgramExerciseText_split(text, draft.baseline);
  const sharedEdits = { ...draft.sharedEdits };
  for (const edit of split.sharedEdits) {
    const original = draft.baseline.find((section) => section.property === edit.property);
    if (original != null && edit.text === original.text) {
      delete sharedEdits[edit.property];
    } else {
      sharedEdits[edit.property] = edit.text;
    }
  }
  return { ...draft, localBlurb: split.localBlurb, sharedEdits };
}

export function ExerciseLiftoEditorDraft_isDirty(draft: IExerciseLiftoEditorDraft): boolean {
  return draft.localBlurb.trim() !== draft.originalLocalBlurb.trim() || Object.keys(draft.sharedEdits).length > 0;
}

// Everything the sheet will write, in one place — validation and save both go through this, so
// there is no second expression of "what will be saved" to drift out of step with the first.
//
// `shared` decides only *where* each edit goes, never *whether* there is one: the save path
// passes a freshly resolved set so edits land on the lines that declare the property now.
export function ExerciseLiftoEditorDraft_pendingChange(
  draft: IExerciseLiftoEditorDraft,
  shared: IProgramExerciseSharedSection[]
): { localBlurb: string; sharedEdits: IProgramExerciseSharedEdit[] } {
  const sharedEdits: IProgramExerciseSharedEdit[] = [];
  for (const section of shared) {
    const edited = draft.sharedEdits[section.property];
    if (edited != null) {
      sharedEdits.push({ property: section.property, owners: section.owners, text: edited });
    }
  }
  return { localBlurb: draft.localBlurb, sharedEdits };
}

// The text a fresh editor mount should start from, which is the draft rendered for the current
// visibility — never a baseline for anything.
export function ExerciseLiftoEditorDraft_mountText(draft: IExerciseLiftoEditorDraft, isSharedVisible: boolean): string {
  return isSharedVisible
    ? ProgramExerciseText_compose(
        draft.localBlurb,
        draft.baseline.map((section) => ({ text: draft.sharedEdits[section.property] ?? section.text }))
      )
    : draft.localBlurb.trimEnd();
}
