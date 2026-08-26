import React from "react";
import { IProgramState } from "../../../types";
import { LiftoscriptSyntaxError } from "../../../liftoscriptEvaluator";
import { WebviewEditor } from "../../primitives/webviewEditor";
import type { IEditorError, IEditorTheme } from "../../../editorTypes";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: LiftoscriptSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: IEditorError) => React.JSX.Element | undefined;
  state: IProgramState;
  value?: string;
  height?: number;
  theme?: IEditorTheme;
}

export function ScriptEditorView(props: IProps): React.JSX.Element {
  return (
    <WebviewEditor
      mode="script"
      value={props.value ?? ""}
      onChange={props.onChange}
      onLineChange={props.onLineChange}
      onBlur={props.onBlur ? (newValue) => props.onBlur!({} as FocusEvent, newValue) : undefined}
      error={props.error}
      lineNumbers={props.lineNumbers}
      state={props.state}
      onCustomErrorCta={props.onCustomErrorCta}
      height={props.height}
      theme={props.theme}
    />
  );
}
