import React, { JSX } from "react";
import { Weight } from "../models/weight";
import { IWeight } from "../types";

interface IWeightLinesUnsubscribedProps {
  weights: { rounded: IWeight; original: IWeight }[];
}

export function WeightLinesUnsubscribed(props: IWeightLinesUnsubscribedProps): JSX.Element {
  return (
    <>
      {props.weights
        .filter((w) => !Weight.eq(w.original, w.rounded))
        .map((w) => {
          return (
            <div key={Weight.display(w.original)} className="mb-1">
              <div className="text-xs text-grayv2-main">
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
