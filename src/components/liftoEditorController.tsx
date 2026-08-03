import { ILiftoEditorContext, ILiftoEditorPill } from "./primitives/liftoEditorBrain";
import { ILiftoEditorProps } from "./primitives/liftoEditor";

export type ILiftoEditorMode = "structured" | "freeform";

export interface ILiftoEditorController {
  mode: ILiftoEditorMode;
  text: string;
  context: ILiftoEditorContext | undefined;
  activeLevelIndex: number;
  pills: ILiftoEditorPill[];
  editorProps: Pick<
    ILiftoEditorProps,
    "initialText" | "autoHeight" | "editable" | "extraStyledRanges" | "handleRef" | "onTextChange" | "onTap"
  >;
  walkFocus: (direction: 1 | -1) => void;
  selectLevel: (index: number) => void;
  applyPill: (pill: ILiftoEditorPill) => void;
  removeFocused: () => void;
  switchToFreeform: () => void;
  switchToStructured: () => void;
}

export interface ILiftoEditorControllerOptions {
  showKeypadNav?: boolean;
}

// Native-only (drives the native LiftoEditor + custom keyboard); web keeps CodeMirror.
export function useLiftoEditorController(
  _initialText: string,
  _options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  throw new Error("useLiftoEditorController is native-only");
}
