import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { IEither } from "../../utils/types";
import { EvalResultInEditor } from "../evalResultInEditor";
import type { CodeEditor } from "../../editor";
import { IWeight, IProgramState } from "../../types";

interface IProps {
  name: string;
  label?: string;
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  value?: string;
  result?: IEither<number | undefined | IWeight, string>;
  state: IProgramState;
}

let editorImport: Promise<{ CodeEditor: typeof CodeEditor }>;

export function OneLineTextEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>();
  const codeEditor = useRef<CodeEditor | undefined>(undefined);

  const onChange = (value: string): void => {
    if (props.onChange && !window.isUndoing) {
      props.onChange(value);
    }
  };

  useEffect(() => {
    if (editorImport == null) {
      editorImport = import("../../editor");
    }
    editorImport.then(({ CodeEditor: CE }) => {
      const ce = new CE({
        state: props.state,
        onChange: (value) => onChange(value),
        onBlur: (value) => props.onBlur?.(value),
        value: props.value,
        multiLine: false,
      });
      ce.attach(divRef.current!);
      codeEditor.current = ce;
    });
  }, []);

  useEffect(() => {
    if (window.isUndoing) {
      const ce = codeEditor.current;
      if (ce && props.value != null) {
        ce.setValue(props.value);
      }
    }
  }, [props.value]);

  let className =
    "relative z-10 block w-full px-2 leading-normal bg-white border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  if (props.label) {
    className += " pt-4";
  } else {
    className += " py-2";
  }
  if (props.result != null && !props.result.success) {
    className += " border-red-300";
  } else {
    className += " border-gray-300";
  }

  return (
    <div className="relative">
      {props.label && (
        <label className="absolute z-20 text-xs text-grayv2-main" style={{ top: "4px", left: "0.75rem" }}>
          {props.label}
        </label>
      )}
      <div data-cy={`oneline-editor-${props.name}`} className={className} ref={divRef}></div>
      {props.result && <EvalResultInEditor result={props.result} />}
    </div>
  );
}
