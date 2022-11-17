import { h, JSX } from "preact";
import { IScreenMuscle } from "../../../models/muscle";

interface IMuscleStyle {
  fill?: string;
  opacity?: number;
}

interface IProps {
  muscles?: Partial<Record<IScreenMuscle, IMuscleStyle>>;
  contour?: IMuscleStyle;
}

export function FrontMusclesSvg(props: IProps): JSX.Element {
  function getOpacity(muscle: IScreenMuscle): number {
    return props.muscles?.[muscle]?.opacity ?? 0.3;
  }

  function getFill(muscle: IScreenMuscle): string {
    return props.muscles?.[muscle]?.fill ?? "#28839F";
  }

  return (
    <svg className="muscle" viewBox="0 0 112 234" version="1.1">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g
          data-id="back"
          opacity={getOpacity("back")}
          fill={getFill("back")}
          transform="translate(34.085925, 27.046000)"
        >
          <use href="/images/front-muscles.svg#back" />
        </g>
        <g
          data-id="forearms"
          opacity={getOpacity("forearms")}
          fill={getFill("forearms")}
          transform="translate(8.383925, 80.657000)"
        >
          <use href="/images/front-muscles.svg#forearms" />
        </g>
        <g
          data-id="chest"
          opacity={getOpacity("chest")}
          fill={getFill("chest")}
          transform="translate(30.865769, 41.393920)"
        >
          <use href="/images/front-muscles.svg#chest" />
        </g>
        <g data-id="abs" opacity={getOpacity("abs")} fill={getFill("abs")} transform="translate(32.792925, 65.058000)">
          <use href="/images/front-muscles.svg#abs" />
        </g>
        <g
          data-id="quadriceps"
          opacity={getOpacity("quadriceps")}
          fill={getFill("quadriceps")}
          transform="translate(26.427837, 108.418000)"
        >
          <use href="/images/front-muscles.svg#quadriceps" />
        </g>
        <g
          data-id="calves"
          opacity={getOpacity("calves")}
          fill={getFill("calves")}
          transform="translate(23.688857, 161.551000)"
        >
          <use href="/images/front-muscles.svg#calves" />
        </g>
        <g
          data-id="shoulders"
          opacity={getOpacity("shoulders")}
          fill={getFill("shoulders")}
          transform="translate(19.035867, 42.008707)"
        >
          <use href="/images/front-muscles.svg#shoulders" />
        </g>
        <g
          data-id="biceps"
          opacity={getOpacity("biceps")}
          fill={getFill("biceps")}
          transform="translate(17.858633, 56.483745)"
        >
          <use href="/images/front-muscles.svg#biceps" />
        </g>
        <g
          data-id="contour"
          opacity={props.contour?.opacity ?? 1}
          fill={props.contour?.fill ?? "#28839F"}
          transform="translate(0.000000, 0.243264)"
        >
          <use href="/images/front-muscles.svg#contour" />
        </g>
      </g>
    </svg>
  );
}
