import { h, JSX } from "preact";

type IProps = JSX.HTMLAttributes<HTMLButtonElement> & { name: string };

export function LinkButton(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <button
      className={`text-bluev2 border-none ${
        !className || className.indexOf("font-normal") === -1 ? "font-bold" : ""
      } ${!className || className.indexOf("no-underline") === -1 ? "underline" : ""} ${className} nm-${props.name}`}
      {...otherProps}
    >
      {children}
    </button>
  );
}
