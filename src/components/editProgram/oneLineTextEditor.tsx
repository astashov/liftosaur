import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { IEither } from "../../utils/types";
import { EvalResultInEditor } from "../evalResultInEditor";
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

export function OneLineTextEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>();
  const codeEditor = useRef<unknown | undefined>(undefined);
  useEffect(() => {
    import("../../editor").then(({ CodeEditor }) => {
      const ce = new CodeEditor({
        state: props.state,
        onChange: (value) => props.onChange?.(value),
        onBlur: (value) => props.onBlur?.(value),
        value: props.value,
        multiLine: false,
      });
      ce.attach(divRef.current!);
      codeEditor.current = ce;
    });
  }, []);

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
