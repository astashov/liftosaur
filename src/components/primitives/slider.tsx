import React, { JSX } from "react";

interface ISliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider(props: ISliderProps): JSX.Element {
  return React.createElement("input", {
    type: "range",
    style: { width: "100%" },
    min: props.min,
    max: props.max,
    step: props.step ?? 1,
    value: props.value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.currentTarget.value);
      if (!isNaN(v)) {
        props.onChange(v);
      }
    },
  });
}
