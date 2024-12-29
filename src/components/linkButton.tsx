import React, { JSX } from "react";

type IProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { name: string };

export function LinkButton(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <button
      className={`text-bluev2 border-none ${
        !className || className.indexOf("font-normal") === -1 ? "font-bold" : ""
      } underline ${className} nm-${props.name}`}
      {...otherProps}
    >
      {children}
    </button>
  );
}
