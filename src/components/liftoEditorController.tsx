import { ILiftoEditorContext } from "./primitives/liftoEditorBrain";
import {
  ILiftoEditorPill,
  ILiftoEditorReuseSelection,
  ILiftoEditorStateVarsTarget,
} from "./primitives/liftoEditorActions";
import { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import { IExercisePickerSelectedExercise, IExerciseType } from "../types";

export type ILiftoEditorMode = "structured" | "freeform";
export type ILiftoEditorSurface = "sheet" | "inline";

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
  // Drops the focus stack, closing the keypad with it — an explicit dismissal.
  blur: () => void;
  // Hands the screen to another editor: same state change as blur (plus leaving freeform, so
  // the native view resigns the system keyboard) but no effects. The incoming editor has
  // already set the shared keypad for its own token, and closing it here would undo that.
  evict: () => void;
}

export interface ILiftoEditorControllerActions {
  pickExercise?: (
    current: string,
    exerciseFullName: string | undefined,
    onSelect: (selected: IExercisePickerSelectedExercise) => void
  ) => void;
  promptRename?: (current: string, kind: "label" | "stateVar", onSubmit: (value: string) => void) => void;
  editReuse?: (targetName: string) => void;
  pickReuse?: (
    kind: "sets" | "progress" | "update",
    exerciseFullName: string | undefined,
    onSelect: (selection: ILiftoEditorReuseSelection) => void
  ) => void;
  editStateVars?: (
    target: ILiftoEditorStateVarsTarget,
    exerciseFullName: string | undefined,
    onApply: (newArgs: string) => void
  ) => void;
}

export interface ILiftoEditorControllerOptions {
  surface?: ILiftoEditorSurface;
  exerciseType?: IExerciseType;
  exerciseTypeFor?: (exerciseFullName: string) => IExerciseType | undefined;
  actions?: ILiftoEditorControllerActions;
  mapPills?: (pills: ILiftoEditorPill[]) => ILiftoEditorPill[];
}

// Native-only (drives the native LiftoEditor + custom keyboard); web keeps CodeMirror.
export function useLiftoEditorController(
  _initialText: string,
  _options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  throw new Error("useLiftoEditorController is native-only");
}
