import { Svg, G, Use } from "react-native-svg";
import { IScreenMuscle } from "../../../types";
import { BackMuscleDefs } from "./backMuscleDefs";

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
    <Svg className="muscle" viewBox="0 0 112 234">
      <BackMuscleDefs />
      <G stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <G
          data-id="back"
          opacity={getOpacity("back")}
          fill={getFill("back")}
          transform="translate(28.250948, 26.431691)"
        >
          <Use href="/images/back-muscles.svg#back" />
        </G>
        <G
          data-id="shoulders"
          opacity={getOpacity("shoulders")}
          fill={getFill("shoulders")}
          transform="translate(18.066334, 41.383607)"
        >
          <Use href="/images/back-muscles.svg#shoulders" />
        </G>
        <G
          data-id="glutes"
          opacity={getOpacity("glutes")}
          fill={getFill("glutes")}
          transform="translate(34.187744, 98.720793)"
        >
          <Use href="/images/back-muscles.svg#glutes" />
        </G>
        <G
          data-id="triceps"
          opacity={getOpacity("triceps")}
          fill={getFill("triceps")}
          transform="translate(13.910000, 56.592542)"
        >
          <Use href="/images/back-muscles.svg#triceps" />
        </G>
        <G
          data-id="forearms"
          opacity={getOpacity("forearms")}
          fill={getFill("forearms")}
          transform="translate(8.884225, 87.710000)"
        >
          <Use href="/images/back-muscles.svg#forearms" />
        </G>
        <G data-id="calves" opacity={getOpacity("calves")} fill={getFill("calves")}>
          <Use href="/images/back-muscles.svg#calves" />
        </G>
        <G
          data-id="hamstrings"
          opacity={getOpacity("hamstrings")}
          fill={getFill("hamstrings")}
          transform="translate(24.854000, 126.371014)"
        >
          <Use href="/images/back-muscles.svg#hamstrings" />
        </G>
        <G data-id="contour" opacity={props.contour?.opacity ?? 1} fill={props.contour?.fill ?? "#28839F"}>
          <Use href="/images/back-muscles.svg#contour" />
        </G>
      </G>
    </Svg>
  );
}
