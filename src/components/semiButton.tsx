import { h, JSX } from "preact";
import { JSXInternal } from "preact/src/jsx";

interface IProps extends JSXInternal.HTMLAttributes<HTMLButtonElement> {
  kind?: "regular" | "narrow";
}

export function SemiButton(props: IProps): JSX.Element {
  let className = "box-border block w-full text-center border border-gray-500 border-dashed rounded-md";
  if (props.kind === "narrow") {
    className += " px-2";
  } else {
    className += " p-2";
  }
  return (
    <button className={className} {...props}>
      {props.children}
    </button>
  );
}
