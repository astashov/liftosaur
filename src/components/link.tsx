import React, { JSX } from "react";

type IProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function Link(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <a target="_blank" className={`text-text-link font-bold underline ${className}`} {...otherProps}>
      {children}
    </a>
  );
}
