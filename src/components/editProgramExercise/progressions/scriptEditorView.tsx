import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { IProgramState } from "../../../types";
import { LiftoscriptSyntaxError } from "../../../liftoscriptEvaluator";
import { ScriptEditor } from "./scriptEditor";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: LiftoscriptSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: string) => JSX.Element | undefined;
  state: IProgramState;
  value?: string;
}

export function ScriptEditorView(props: IProps): JSX.Element {
  const onChange = (value: string): void => {
    if (props.onChange && !window.isUndoing) {
      props.onChange(value);
    }
  };

  const codeEditor = useRef<ScriptEditor | undefined>(undefined);
  useEffect(() => {
    const ce = new ScriptEditor({
      onChange: onChange,
      onLineChange: props.onLineChange,
      onBlur: props.onBlur,
      value: props.value,
      error: props.error,
      lineNumbers: props.lineNumbers,
      state: props.state,
    });
    ce.attach(divRef.current!);
    codeEditor.current = ce;
  }, []);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.setState(props.state);
    }
  }, [props.state]);

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
    "block w-full px-2 py-2 leading-normal bg-background-default border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  if (props.error != null) {
    className += " border-red-500";
  } else {
    className += " border-gray-300";
  }

  return (
    <div className="planner-editor-view" style={{ fontFamily: "Iosevka Web" }}>
      <div className={props.lineNumbers ? "planner-editor-error bg-background-darkred z-30" : ""}>
        {props.error && (
          <EvalResult redTheme={props.lineNumbers} error={props.error} onCustomErrorCta={props.onCustomErrorCta} />
        )}
      </div>
      <div data-cy="planner-editor" className={className} ref={divRef}></div>
    </div>
  );
}

interface IEvalResultProps {
  error?: LiftoscriptSyntaxError;
  redTheme?: boolean;
  onCustomErrorCta?: (error: string) => JSX.Element | undefined;
}

export function EvalResult(props: IEvalResultProps): JSX.Element | null {
  if (props.error) {
    const customErrorCta = props.onCustomErrorCta && props.onCustomErrorCta(props.error.message);
    return (
      <span className="px-2 text-sm">
        <span className={props.redTheme ? "text-redv2-100" : "text-red-500"}>Error: </span>
        <span className={`font-bold ${props.redTheme ? "text-text-alwayswhite" : "text-red-700"}`}>
          {props.error.message}
        </span>
        <span className="ml-2">{customErrorCta}</span>
      </span>
    );
  } else {
    return null;
  }
}
