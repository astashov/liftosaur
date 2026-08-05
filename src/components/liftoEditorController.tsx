import { ILiftoEditorContext } from "./primitives/liftoEditorBrain";
import { ILiftoEditorPill } from "./primitives/liftoEditorActions";
import { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import { IExerciseType } from "../types";

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
  applyPill: (pill: ILiftoEditorPill) => void;
  removeFocused: () => void;
  switchToFreeform: () => void;
  switchToStructured: () => void;
}

export interface ILiftoEditorControllerOptions {
  showKeypadNav?: boolean;
  exerciseType?: IExerciseType;
}

// Native-only (drives the native LiftoEditor + custom keyboard); web keeps CodeMirror.
export function useLiftoEditorController(
  _initialText: string,
  _options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  throw new Error("useLiftoEditorController is native-only");
}
