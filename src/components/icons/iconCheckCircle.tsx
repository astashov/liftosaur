import React, { JSX } from "react";

interface IProps {
  isChecked: boolean;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function IconCheckCircle(props: IProps): JSX.Element {
  const color = props.color || "#28839F";
  if (props.isChecked) {
    return (
      <svg
        style={props.style}
        className={props.className}
        width="18"
        height="19"
        viewBox="0 0 18 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 0.5C4.02975 0.5 0 4.52975 0 9.5C0 14.4703 4.02975 18.5 9 18.5C13.9703 18.5 18 14.4703 18 9.5C18 4.52975 13.9703 0.5 9 0.5ZM8.0625 13.469L4.6875 10.196L6.08025 8.8025L8.0625 10.682L12.2948 6.344L13.6875 7.73675L8.0625 13.469Z"
          fill={color}
        />
      </svg>
    );
  } else {
    return (
      <div
        style={{ ...props.style, width: "18px", height: "18px", borderWidth: "2px" }}
        className={`${props.className ?? ""} border rounded-full border-bluev2`}
      />
    );
  }
}
