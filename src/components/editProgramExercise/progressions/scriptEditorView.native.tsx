import React from "react";
import { IProgramState } from "../../../types";
import { LiftoscriptSyntaxError } from "../../../liftoscriptEvaluator";
import { WebviewEditor } from "../../primitives/webviewEditor";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: LiftoscriptSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: string) => React.JSX.Element | undefined;
  state: IProgramState;
  value?: string;
  height?: number;
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
    />
  );
}
