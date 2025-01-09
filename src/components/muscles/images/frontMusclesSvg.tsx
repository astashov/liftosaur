import { Svg, G, Use } from "react-native-svg";
import { IScreenMuscle } from "../../../types";
import { FrontMuscleDefs } from "./frontMuscleDefs";

interface IMuscleStyle {
  fill?: string;
  opacity?: number;
}

interface IProps {
  muscles?: Partial<Record<IScreenMuscle, IMuscleStyle>>;
  contour?: IMuscleStyle;
  defaultOpacity?: number;
}

export function FrontMusclesSvg(props: IProps): JSX.Element {
  function getOpacity(muscle: IScreenMuscle): number {
    return props.muscles?.[muscle]?.opacity ?? props.defaultOpacity ?? 0.3;
  }

  function getFill(muscle: IScreenMuscle): string {
    return props.muscles?.[muscle]?.fill ?? "#28839F";
  }

  return (
    <Svg className="muscle" viewBox="0 0 112 234">
      <FrontMuscleDefs />
      <G stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <G
          data-id="back"
          opacity={getOpacity("back")}
          fill={getFill("back")}
          transform="translate(34.085925, 27.046000)"
        >
          <Use href="#back" />
        </G>
        <G
          data-id="forearms"
          opacity={getOpacity("forearms")}
          fill={getFill("forearms")}
          transform="translate(8.383925, 80.657000)"
        >
          <Use href="#forearms" />
        </G>
        <G
          data-id="chest"
          opacity={getOpacity("chest")}
          fill={getFill("chest")}
          transform="translate(30.865769, 41.393920)"
        >
          <Use href="#chest" />
        </G>
        <G data-id="abs" opacity={getOpacity("abs")} fill={getFill("abs")} transform="translate(32.792925, 65.058000)">
          <Use href="#abs" />
        </G>
        <G
          data-id="quadriceps"
          opacity={getOpacity("quadriceps")}
          fill={getFill("quadriceps")}
          transform="translate(26.427837, 108.418000)"
        >
          <Use href="#quadriceps" />
        </G>
        <G
          data-id="calves"
          opacity={getOpacity("calves")}
          fill={getFill("calves")}
          transform="translate(23.688857, 161.551000)"
        >
          <Use href="#calves" />
        </G>
        <G
          data-id="shoulders"
          opacity={getOpacity("shoulders")}
          fill={getFill("shoulders")}
          transform="translate(19.035867, 42.008707)"
        >
          <Use href="#shoulders" />
        </G>
        <G
          data-id="biceps"
          opacity={getOpacity("biceps")}
          fill={getFill("biceps")}
          transform="translate(17.858633, 56.483745)"
        >
          <Use href="#biceps" />
        </G>
        <G
          data-id="contour"
          opacity={props.contour?.opacity ?? 1}
          fill={props.contour?.fill ?? "#28839F"}
          transform="translate(0.000000, 0.243264)"
        >
          <Use href="#contour" />
        </G>
      </G>
    </Svg>
  );
}
