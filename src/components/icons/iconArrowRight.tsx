import React, { JSX } from "react";

interface IProps {
  style?: { [key: string]: string | number };
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}

export function IconArrowRight(props: IProps): JSX.Element {
  const width = props.width || 7;
  const height = props.height || 12;
  return (
    <svg
      style={props.style}
      className={props.className}
      width={width}
      height={height}
      viewBox="0 0 7 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1L6 6L1 11"
        stroke={props.color || "#818385"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
