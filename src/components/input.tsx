import { JSXInternal } from "preact/src/jsx";
import { h, JSX } from "preact";

export function Input(props: JSXInternal.HTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
      {...props}
    />
  );
}
