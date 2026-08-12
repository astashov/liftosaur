import type { IDayData } from "../../types";
import type { IEditorSheetExercisePickerModalData } from "../ModalStateContext";
import type { ILiftoEditorReuseCandidates } from "../../components/liftoEditorReuse";
import type { IProgramExerciseIdentity } from "../../models/programExerciseSwap";
import type { IProgramExerciseTextError } from "../../models/programExerciseText";

// The banner/line-tint renders exactly what the save pipeline produces, so the two can't drift.
export type IEditorSheetLiveError = IProgramExerciseTextError;

export interface IEditorSheetInstanceOption {
  dayData: Required<IDayData>;
  label: string;
  isSelected: boolean;
}

export interface IEditorSheetBodyProps {
  initialText: string;
  headerLabel: string;
  instances: IEditorSheetInstanceOption[];
  onSelectInstance: (instance: IEditorSheetInstanceOption) => void;
  // Autocomplete source for the web CodeMirror body; the native structured editor
  // gets exercise names through its own picker instead.
  exerciseFullNames: string[];
  pickerData?: IEditorSheetExercisePickerModalData;
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
  validateText?: (text: string) => IEditorSheetLiveError | undefined;
  // Changing which exercise this is affects the program beyond this blurb, so the host gets
  // to ask how far it should reach before the change is made. Both resolve to false when the
  // user backs out, which cancels the change. The host asks again at save if neither ran.
  onBeforeChangeExercise?: () => Promise<boolean>;
  onBeforeApply?: (text: string) => Promise<boolean>;
  onDone: (text: string) => void;
}
