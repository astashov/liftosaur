import React, { JSX } from "react";
import { IScreenMuscle } from "../../../types";

export interface IMuscleStyle {
  fill?: string;
  opacity?: number;
}

export type IMuscleMapInput = Partial<Record<IScreenMuscle, IMuscleStyle>>;

interface IProps {
  muscles?: IMuscleMapInput;
  contour?: IMuscleStyle;
  defaultOpacity?: number;
}

export function BackMusclesSvg(props: IProps): JSX.Element {
  function getOpacity(muscle: IScreenMuscle): number {
    return props.muscles?.[muscle]?.opacity ?? props.defaultOpacity ?? 0.3;
  }

  function getFill(muscle: IScreenMuscle): string {
    return props.muscles?.[muscle]?.fill ?? "#28839F";
  }

  return (
    <svg className="muscle" viewBox="0 0 112 234" version="1.1">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g
          data-id="back"
          opacity={getOpacity("back")}
          fill={getFill("back")}
          transform="translate(28.250948, 26.431691)"
        >
          <use href="/images/back-muscles.svg#back" />
        </g>
        <g
          data-id="shoulders"
          opacity={getOpacity("shoulders")}
          fill={getFill("shoulders")}
          transform="translate(18.066334, 41.383607)"
        >
          <use href="/images/back-muscles.svg#shoulders" />
        </g>
        <g
          data-id="glutes"
          opacity={getOpacity("glutes")}
          fill={getFill("glutes")}
          transform="translate(34.187744, 98.720793)"
        >
          <use href="/images/back-muscles.svg#glutes" />
        </g>
        <g
          data-id="triceps"
          opacity={getOpacity("triceps")}
          fill={getFill("triceps")}
          transform="translate(13.910000, 56.592542)"
        >
          <use href="/images/back-muscles.svg#triceps" />
        </g>
        <g
          data-id="forearms"
          opacity={getOpacity("forearms")}
          fill={getFill("forearms")}
          transform="translate(8.884225, 87.710000)"
        >
          <use href="/images/back-muscles.svg#forearms" />
        </g>
        <g data-id="calves" opacity={getOpacity("calves")} fill={getFill("calves")}>
          <use href="/images/back-muscles.svg#calves" />
        </g>
        <g
          data-id="hamstrings"
          opacity={getOpacity("hamstrings")}
          fill={getFill("hamstrings")}
          transform="translate(24.854000, 126.371014)"
        >
          <use href="/images/back-muscles.svg#hamstrings" />
        </g>
        <g data-id="contour" opacity={props.contour?.opacity ?? 1} fill={props.contour?.fill ?? "#28839F"}>
          <use href="/images/back-muscles.svg#contour" />
        </g>
      </g>
    </svg>
  );
}
