import { ILiftoEditorContext } from "./primitives/liftoEditorBrain";
import { ILiftoEditorPill, ILiftoEditorReuseSelection } from "./primitives/liftoEditorActions";
import { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import { IExercisePickerSelectedExercise, IExerciseType } from "../types";

export type ILiftoEditorMode = "structured" | "freeform";

export interface ILiftoEditorController {
  mode: ILiftoEditorMode;
  text: string;
  context: ILiftoEditorContext | undefined;
  activeLevelIndex: number;
  pills: ILiftoEditorPill[];
  editorProps: ILiftoEditorBaseProps;
  walkFocus: (direction: 1 | -1) => void;
  selectLevel: (index: number) => void;
  pressPill: (pill: ILiftoEditorPill) => void;
  removeFocused: () => void;
  switchToStructured: () => void;
}

export interface ILiftoEditorControllerActions {
  pickExercise?: (current: string, onSelect: (selected: IExercisePickerSelectedExercise) => void) => void;
  promptRename?: (current: string, onSubmit: (value: string) => void) => void;
  editReuse?: (targetName: string) => void;
  pickReuse?: (kind: "sets" | "progress" | "update", onSelect: (selection: ILiftoEditorReuseSelection) => void) => void;
}

export interface ILiftoEditorControllerOptions {
  exerciseType?: IExerciseType;
  actions?: ILiftoEditorControllerActions;
}

// Native-only (drives the native LiftoEditor + custom keyboard); web keeps CodeMirror.
export function useLiftoEditorController(
  _initialText: string,
  _options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  throw new Error("useLiftoEditorController is native-only");
}
