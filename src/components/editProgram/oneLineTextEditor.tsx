import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { CodeEditor } from "../../editor";
import { IEither } from "../../utils/types";
import { EvalResultInEditor } from "../evalResultInEditor";

interface IProps {
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  value?: string;
  result?: IEither<number | undefined, string>;
  state: Record<string, number>;
}

export function OneLineTextEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>();
  const codeEditor = useRef(
    new CodeEditor({
      state: props.state,
      onChange: props.onChange,
      onBlur: props.onBlur,
      value: props.value,
      multiLine: false,
    })
  );

  useEffect(() => {
    codeEditor.current.attach(divRef.current!);
  }, []);

  let className =
    "relative z-10 block w-full px-2 py-2 leading-normal bg-white border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  if (props.result != null && !props.result.success) {
    className += " border-red-300";
  } else {
    className += " border-gray-300";
  }

  return (
    <div>
      <div className={className} ref={divRef}></div>
      {props.result && <EvalResultInEditor result={props.result} />}
    </div>
  );
}
