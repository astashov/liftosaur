import { IEither } from "../utils/types";
import { h, JSX } from "preact";

export function EvalResultInEditor(props: { result: IEither<number | undefined, string> }): JSX.Element {
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
