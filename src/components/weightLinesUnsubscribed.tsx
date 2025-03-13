import { h, JSX, Fragment } from "preact";
import { Weight } from "../models/weight";
import { IPercentage, IWeight } from "../types";

interface IWeightLinesUnsubscribedProps {
  weights: { rounded: IWeight; original: IWeight | IPercentage }[];
}

export function WeightLinesUnsubscribed(props: IWeightLinesUnsubscribedProps): JSX.Element {
  return (
    <>
      {props.weights
        .filter((w) => !Weight.eq(w.original, w.rounded))
        .map((w) => {
          return (
            <div>
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
