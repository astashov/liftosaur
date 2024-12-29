import React, { JSX } from "react";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
}

export function IconArrowUp(props: IProps): JSX.Element {
  return (
    <svg
      style={props.style}
      className={props.className}
      width="13"
      height="8"
      viewBox="0 0 13 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 6.5L6.5 1.5L11.5 6.5"
        stroke={props.color || "#818385"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
