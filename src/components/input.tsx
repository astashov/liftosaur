import { JSXInternal } from "preact/src/jsx";
import { h, JSX, Ref } from "preact";
import { forwardRef } from "preact/compat";

export const Input = forwardRef(
  (props: JSXInternal.HTMLAttributes<HTMLInputElement>, ref?: Ref<HTMLInputElement>): JSX.Element => {
    console.log("INput PRops", props);
    return (
      <input
        ref={ref}
        className={`block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline ${
          props.className ?? ""
        }`}
        {...props}
      />
    );
  }
);
