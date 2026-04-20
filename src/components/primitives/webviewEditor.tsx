import React from "react";
import { IEditorError, IEditorMode, IEditorTheme } from "../../pages/planner/webviewEditor/editorWebviewBridge";
import { IAllCustomExercises, IProgramState } from "../../types";

export interface IWebviewEditorProps {
  mode: IEditorMode;
  value: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (newValue: string) => void;
  error?: IEditorError;
  lineNumbers?: boolean;
  customExercises?: IAllCustomExercises;
  exerciseFullNames?: string[];
  state?: IProgramState;
  onCustomErrorCta?: (error: string) => React.ReactNode;
  height?: number;
  theme?: IEditorTheme;
}

export function WebviewEditor(_props: IWebviewEditorProps): React.JSX.Element {
  throw new Error("WebviewEditor is native-only; use PlannerEditorView / ScriptEditorView on web.");
}
