import React, { JSX } from "react";

interface ISelectOption {
  value: string;
  label: string;
}

interface ISelectProps {
  value: string;
  options: ISelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select(props: ISelectProps): JSX.Element {
  return React.createElement(
    "select",
    {
      className: props.className,
      value: props.value,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => props.onChange(e.currentTarget.value),
    },
    props.options.map((o) => React.createElement("option", { key: o.value, value: o.value }, o.label))
  );
}
