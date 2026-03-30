import type { JSX } from "react";
import { Weight_eq } from "../models/weight";
import { IPercentage, IWeight } from "../types";

interface IWeightLinesUnsubscribedProps {
  weights: { rounded: IWeight; original: IWeight | IPercentage }[];
}

export function WeightLinesUnsubscribed(props: IWeightLinesUnsubscribedProps): JSX.Element {
  return (
    <>
      {props.weights
        .filter((w) => !Weight_eq(w.original, w.rounded))
        .map((w, i) => {
          return (
            <div key={i}>
              <div className="text-xs text-text-secondary">
                <span className="line-through">
                  {Number(w.original.value?.toFixed(2))} {w.original.unit}
                </span>
                <span> → </span>
                <span>
                  {w.rounded.value} {w.rounded.unit}
                </span>
              </div>
            </div>
          );
        })}
    </>
  );
}
