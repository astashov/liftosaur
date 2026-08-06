import type { IDayData } from "../../types";
import type { IEditorSheetExercisePickerModalData } from "../ModalStateContext";

export interface IEditorSheetLiveError {
  message: string;
  from?: number;
  to?: number;
}

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
  // Keeps the host informed of the current draft so closing the sheet can warn about
  // unsaved changes.
  onTextChange?: (text: string) => void;
  onEditReuse?: (targetName: string) => void;
  validateText?: (text: string) => IEditorSheetLiveError | undefined;
  onDone: (text: string) => void;
}
