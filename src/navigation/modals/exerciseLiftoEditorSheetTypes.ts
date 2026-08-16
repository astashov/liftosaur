import type { IDayData } from "../../types";
import type { ILiftoEditorExercisePickerModalData } from "../ModalStateContext";
import type { ILiftoEditorReuseCandidates } from "../../components/liftoEditorReuse";
import type { IProgramExerciseIdentity } from "../../models/programExerciseSwap";
import type { IProgramExerciseTextError } from "../../models/programExerciseText";
import type { ILiftoEditorStateVarsContext } from "../../components/primitives/liftoEditorStateVars";
import type { ILiftoEditorStateVarsTarget } from "../../components/primitives/liftoEditorActions";

// The banner/line-tint renders exactly what the save pipeline produces, so the two can't drift.
export type IExerciseLiftoEditorSheetLiveError = IProgramExerciseTextError;

export interface IExerciseLiftoEditorSheetSharedProperty {
  property: string;
  // The section's source, so the body can splice it in when the user asks to see it.
  text: string;
  ownerLabel: string;
  ownerDayData: Required<IDayData>;
}

export interface IExerciseLiftoEditorSheetSharedLabel {
  properties: string[];
  ownerLabel: string;
  ownerDayData: Required<IDayData>;
}

// One line per declaring day rather than per property: several properties usually come from
// the same line, and "progress, update defined at W1 · D1" is the whole story in one row.
export function ExerciseLiftoEditorSheetTypes_sharedLabels(
  shared: IExerciseLiftoEditorSheetSharedProperty[]
): IExerciseLiftoEditorSheetSharedLabel[] {
  const byOwner = new Map<string, IExerciseLiftoEditorSheetSharedLabel>();
  for (const item of shared) {
    const existing = byOwner.get(item.ownerLabel);
    byOwner.set(item.ownerLabel, {
      properties: [...(existing?.properties ?? []), item.property],
      ownerLabel: item.ownerLabel,
      ownerDayData: item.ownerDayData,
    });
  }
  return Array.from(byOwner.values());
}

// The exercise with its reuses resolved and the properties declared elsewhere folded in, or why
// it couldn't be resolved. Read-only — it is an answer to "what does this line mean", not
// another way to write one.
export type IExerciseLiftoEditorSheetPreview = { text: string } | { error: string };

export interface IExerciseLiftoEditorSheetAnalysis {
  error?: IExerciseLiftoEditorSheetLiveError;
  // Only when asked for: resolving the exercise costs a pass the banner doesn't need.
  preview?: IExerciseLiftoEditorSheetPreview;
}

export interface IExerciseLiftoEditorSheetInstanceOption {
  dayData: Required<IDayData>;
  label: string;
  isSelected: boolean;
}

export interface IExerciseLiftoEditorSheetProps {
  initialText: string;
  headerLabel: string;
  instances: IExerciseLiftoEditorSheetInstanceOption[];
  onSelectInstance: (instance: IExerciseLiftoEditorSheetInstanceOption) => void;
  // Sections of `initialText` that are declared on another day's line and govern the whole
  // program. The native body fades them and captions where each is from; the host routes edits
  // back. The web body ignores these — it has no way to reveal or edit them, and naming a
  // property the user can't act on is worse than saying nothing.
  sharedProperties?: IExerciseLiftoEditorSheetSharedProperty[];
  // Whether the shared sections are currently in `initialText`. Owned by the host, which
  // remounts this body with the recomposed text when it flips — splicing a multi-section
  // suffix into the live document trips a Runestone line-fragment assertion.
  isSharedVisible?: boolean;
  onToggleShared?: () => void;
  // Reported when the body drops the sections out of the text itself (entering freeform) rather
  // than through the toggle — the host records it without remounting, which would bounce the
  // user straight back out of freeform.
  onSharedHidden?: (localText: string) => void;
  // Autocomplete source for the web CodeMirror body; the native structured editor
  // gets exercise names through its own picker instead.
  exerciseFullNames: string[];
  pickerData?: ILiftoEditorExercisePickerModalData;
  // Resolves the exercise the text currently names. `pickerData` is snapshotted when the
  // sheet opens, so after a swap it describes the exercise that *was* there — anything the
  // user can act on again (picking another exercise, plate math on the keypad) has to ask
  // this instead.
  exerciseFor?: (fullName: string | undefined) => IProgramExerciseIdentity | undefined;
  // Keeps the host informed of the current draft so closing the sheet can warn about
  // unsaved changes.
  onTextChange?: (text: string) => void;
  onEditReuse?: (targetName: string) => void;
  // Lets the host adapt chrome outside the body (the safe-area gesture hint) to the
  // structured/freeform switch; the web body never calls it.
  onModeChange?: (mode: "structured" | "freeform") => void;
  reuseCandidates?: ILiftoEditorReuseCandidates;
  // Where the state vars of a reused progress come from. Asked per press rather than
  // snapshotted: which exercise the progress reuses is part of the text being edited, so
  // only the live pill knows it, and the host is what can resolve it in the program.
  stateVarsFor?: (target: ILiftoEditorStateVarsTarget) => ILiftoEditorStateVarsContext;
  // One pass over the draft answering both questions a body asks about it: the banner's error
  // and, when the resolved panel is open, what the exercise fills in to. Both come out of the
  // same splice, so the two can't disagree and the program isn't spliced twice per keystroke.
  analyzeText?: (text: string, options: { withPreview: boolean }) => IExerciseLiftoEditorSheetAnalysis;
  // Changes when the program a pass would read has moved under the sheet — a stacked sheet
  // saving this exercise's reuse target — so a body knows its last answers are stale even though
  // the text it holds hasn't changed.
  analysisRevision?: number;
  // Changing which exercise this is affects the program beyond this blurb, so the host gets
  // to ask how far it should reach before the change is made. Both resolve to false when the
  // user backs out, which cancels the change. The host asks again at save if neither ran.
  onBeforeChangeExercise?: () => Promise<boolean>;
  onBeforeApply?: (text: string) => Promise<boolean>;
  onDone: (text: string) => void;
}
