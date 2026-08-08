import { JSX } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ILiftoEditorHandle, ILiftoEditorStyledRange, LiftoEditorParseCache } from "./liftoEditorBrain";

// The controller-driven surface: everything useLiftoEditorController produces as editorProps.
// Host surfaces layer presentation concerns (style, selection callbacks) on top via
// ILiftoEditorProps.
export interface ILiftoEditorBaseProps {
  initialText: string;
  autoHeight?: boolean;
  editable?: boolean;
  bottomPadding?: number;
  extraStyledRanges?: ILiftoEditorStyledRange[];
  parseCache?: LiftoEditorParseCache;
  handleRef?: React.MutableRefObject<ILiftoEditorHandle | undefined>;
  onTextChange?: (text: string) => void;
  onTap?: (index: number) => void;
  // Answer to handle.requestCaretRect: the range's vertical extent (dp) inside the editor.
  onCaretRect?: (rect: { top: number; bottom: number }) => void;
}

export interface ILiftoEditorProps extends ILiftoEditorBaseProps {
  style?: StyleProp<ViewStyle>;
  onSelectionChange?: (start: number, end: number) => void;
}

// Native-only component (Runestone/sora-editor hosts); web keeps the CodeMirror editors.
export function LiftoEditor(_props: ILiftoEditorProps): JSX.Element {
  throw new Error("LiftoEditor is native-only");
}
