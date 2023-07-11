import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { PlannerEditor } from "../plannerEditor";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent) => void;
  result?: IPlannerEvalResult;
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
    });
    ce.attach(divRef.current!);
    codeEditor.current = ce;
  }, []);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.args.onLineChange = props.onLineChange;
    }
  }, [props.onLineChange]);

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
    "block w-full px-2 py-2 leading-normal bg-white border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  if (props.result != null && !props.result.success) {
    className += " border-red-500";
  } else {
    className += " border-gray-300";
  }

  return (
    <div className="planner-editor-view" style={{ fontFamily: "Iosevka Web" }}>
      {props.result && <EvalResult result={props.result} />}
      <div data-cy={`multiline-editor-${props.name}`} className={className} ref={divRef}></div>
    </div>
  );
}

export function EvalResult(props: { result: IPlannerEvalResult }): JSX.Element | null {
  if (!props.result.success) {
    return (
      <span className="text-sm">
        <span className="text-red-500">Error: </span>
        <span className="font-bold text-red-700">{props.result.error.message}</span>
      </span>
    );
  } else {
    return null;
  }
}
