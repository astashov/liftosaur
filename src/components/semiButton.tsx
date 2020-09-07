import { h, JSX } from "preact";
import { JSXInternal } from "preact/src/jsx";

export function SemiButton(props: JSXInternal.HTMLAttributes<HTMLButtonElement>): JSX.Element {
  return (
    <button
      className="box-border block w-full p-2 text-center border border-gray-500 border-dashed rounded-md"
      {...props}
    >
      {props.children}
    </button>
  );
}
