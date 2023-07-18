import { h, JSX } from "preact";

type IProps = JSX.HTMLAttributes<HTMLButtonElement>;

export function LinkButton(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <button
      className={`text-bluev2 border-none ${
        !className || className.indexOf("font-normal") === -1 ? "font-bold" : ""
      } underline ${className}`}
      {...otherProps}
    >
      {children}
    </button>
  );
}
