import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { IAllCustomExercises } from "../../../types";
import { PlannerEditor } from "../plannerEditor";
import { PlannerSyntaxError } from "../plannerExerciseEvaluator";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: PlannerSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: string) => JSX.Element | undefined;
  customExercises: IAllCustomExercises;
  exerciseFullNames: string[];
  value?: string;
}

export function PlannerEditorView(props: IProps): JSX.Element {
  const onChange = (value: string): void => {
    if (props.onChange && !window.isUndoing) {
      props.onChange(value);
    }
  };

  const codeEditor = useRef<PlannerEditor | undefined>(undefined);
  useEffect(() => {
    const ce = new PlannerEditor({
      onChange: onChange,
      onLineChange: props.onLineChange,
      onBlur: props.onBlur,
      value: props.value,
      error: props.error,
      lineNumbers: props.lineNumbers,
      customExercises: props.customExercises,
    });
    ce.attach(divRef.current!);
    codeEditor.current = ce;
  }, []);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.setCustomExercises(props.customExercises);
    }
  }, [props.customExercises]);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.setExerciseFullNames(props.exerciseFullNames);
    }
  }, [props.exerciseFullNames]);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.args.onLineChange = props.onLineChange;
    }
  }, [props.onLineChange]);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.setError(props.error);
    }
  }, [props.error]);

  useEffect(() => {
    if (window.isUndoing) {
      const ce = codeEditor.current;
      if (ce && props.value != null) {
        ce.setValue(props.value);
      }
    }
  }, [props.value]);

  const divRef = useRef<HTMLDivElement>();

  let className =
    "block w-full px-2 py-2 leading-normal border rounded-lg appearance-none bg-background-default focus:outline-none focus:shadow-outline";
  if (props.error != null) {
    className += " border-red-500";
  } else {
    className += " border-border-neutral";
  }

  return (
    <div className="planner-editor-view" style={{ fontFamily: "Iosevka Web" }}>
      <div className={props.lineNumbers ? "planner-editor-error sticky bg-background-darkred z-30" : ""}>
        {props.error && (
          <EvalResult redTheme={props.lineNumbers} error={props.error} onCustomErrorCta={props.onCustomErrorCta} />
        )}
      </div>
      <div data-cy="planner-editor" className={className} ref={divRef}></div>
    </div>
  );
}

interface IEvalResultProps {
  error?: PlannerSyntaxError;
  redTheme?: boolean;
  onCustomErrorCta?: (error: string) => JSX.Element | undefined;
}

export function EvalResult(props: IEvalResultProps): JSX.Element | null {
  if (props.error) {
    const customErrorCta = props.onCustomErrorCta && props.onCustomErrorCta(props.error.message);
    return (
      <span className="px-2 text-sm">
        <span className={props.redTheme ? "text-text-alwayswhite" : "text-text-error"}>Error: </span>
        <span className={`font-bold ${props.redTheme ? "text-text-alwayswhite" : "text-text-error"}`}>
          {props.error.message}
        </span>
        <span className="ml-2">{customErrorCta}</span>
      </span>
    );
  } else {
    return null;
  }
}
