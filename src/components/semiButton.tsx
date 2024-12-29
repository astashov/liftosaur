import React, { JSX } from "react";

export function SemiButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const className = [
    props.className,
    "box-border block w-full p-2 text-center border border-gray-500 border-dashed rounded-md",
  ]
    .filter((l) => l)
    .join(" ");
  return (
    <button {...props} className={className}>
      {props.children}
    </button>
  );
}
