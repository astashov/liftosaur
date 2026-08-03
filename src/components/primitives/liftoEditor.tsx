import { JSX } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ILiftoEditorHandle, ILiftoEditorStyledRange } from "./liftoEditorBrain";

export interface ILiftoEditorProps {
  initialText: string;
  style?: StyleProp<ViewStyle>;
  autoHeight?: boolean;
  editable?: boolean;
  extraStyledRanges?: ILiftoEditorStyledRange[];
  handleRef?: React.MutableRefObject<ILiftoEditorHandle | undefined>;
  onTextChange?: (text: string) => void;
  onSelectionChange?: (start: number, end: number) => void;
  onTap?: (index: number) => void;
}

// Native-only component (Runestone/sora-editor hosts); web keeps the CodeMirror editors.
export function LiftoEditor(_props: ILiftoEditorProps): JSX.Element {
  throw new Error("LiftoEditor is native-only");
}
