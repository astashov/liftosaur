import React from "react";
import { IAllCustomExercises } from "../../../types";
import { PlannerSyntaxError } from "../plannerExerciseEvaluator";
import { WebviewEditor } from "../../../components/primitives/webviewEditor";
import type { IEditorError, IEditorTheme } from "../../../editorTypes";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: PlannerSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: IEditorError) => React.JSX.Element | undefined;
  customExercises: IAllCustomExercises;
  exerciseFullNames: string[];
  value?: string;
  height?: number;
  autoHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
  theme?: IEditorTheme;
}

export function PlannerEditorView(props: IProps): React.JSX.Element {
  return (
    <WebviewEditor
      mode="planner"
      value={props.value ?? ""}
      onChange={props.onChange}
      onLineChange={props.onLineChange}
      onBlur={props.onBlur ? (newValue) => props.onBlur!({} as FocusEvent, newValue) : undefined}
      error={props.error}
      lineNumbers={props.lineNumbers}
      customExercises={props.customExercises}
      exerciseFullNames={props.exerciseFullNames}
      onCustomErrorCta={props.onCustomErrorCta}
      height={props.height}
      autoHeight={props.autoHeight}
      minHeight={props.minHeight}
      maxHeight={props.maxHeight}
      theme={props.theme}
    />
  );
}
