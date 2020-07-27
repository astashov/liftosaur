import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { CodeEditor } from "../../editor";
import { IEither } from "../../utils/types";

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
      {props.result && <Result result={props.result} />}
    </div>
  );
}

function Result(props: { result: IEither<number | undefined, string> }): JSX.Element {
  if (props.result.success) {
    return (
      <span className="text-sm">
        <span className="text-gray-500">Evaluation result: </span>
        <span className="font-bold">{props.result.data}</span>
      </span>
    );
  } else {
    return (
      <span className="text-sm">
        <span className="text-red-500">Error: </span>
        <span className="font-bold text-red-700">{props.result.error}</span>
      </span>
    );
  }
}
