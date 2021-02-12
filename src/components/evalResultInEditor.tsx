import { IEither } from "../utils/types";
import { h, JSX } from "preact";
import { Weight } from "../models/weight";
import { IWeight } from "../types";

export function EvalResultInEditor(props: { result: IEither<number | IWeight | undefined, string> }): JSX.Element {
  if (props.result.success) {
    return (
      <span className="text-sm">
        <span className="text-gray-500">Evaluation result: </span>
        <span className="font-bold">{props.result.data != null ? Weight.display(props.result.data) : undefined}</span>
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
