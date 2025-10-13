import { h, JSX } from "preact";

type IProps = JSX.HTMLAttributes<HTMLButtonElement> & { name: string; "data-cy"?: string };

export function LinkButton(props: IProps): JSX.Element {
  const { className, children, "data-cy": dataCy, ...otherProps } = props;
  return (
    <button
      data-cy={dataCy || props.name}
      className={`text-text-link border-none ${
        !className || className.indexOf("font-normal") === -1 ? "font-bold" : ""
      } ${!className || className.indexOf("no-underline") === -1 ? "underline" : ""} ${className} nm-${props.name}`}
      {...otherProps}
    >
      {children}
    </button>
  );
}
