import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { CodeEditor } from "../../editor";
import { IEither } from "../../utils/types";
import { EvalResultInEditor } from "../evalResultInEditor";
import { IProgramState } from "../../types";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  result?: IEither<number | undefined, string>;
  value?: string;
  state: IProgramState;
  height?: number;
}

export function MultiLineTextEditor(props: IProps): JSX.Element {
  const codeEditor = useRef<CodeEditor | undefined>(undefined);
  useEffect(() => {
    import("../../editor").then(({ CodeEditor: CE }) => {
      const ce = new CE({
        state: props.state,
        onChange: props.onChange,
        onBlur: props.onBlur,
        value: props.value,
        multiLine: true,
        height: props.height,
      });
      ce.attach(divRef.current!);
      codeEditor.current = ce;
    });
  }, []);

  useEffect(() => {
    if (codeEditor.current) {
      codeEditor.current.updateState(props.state);
    }
  });

  const divRef = useRef<HTMLDivElement>();

  let className =
    "relative z-10 block w-full px-2 py-2 leading-normal bg-white border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  if (props.result != null && !props.result.success) {
    className += " border-red-500";
  } else {
    className += " border-gray-300";
  }

  return (
    <div style={{ fontFamily: "Iosevka Web" }}>
      {props.result && <EvalResultInEditor result={props.result} />}
      <div data-cy={`multiline-editor-${props.name}`} className={className} ref={divRef}></div>
    </div>
  );
}
