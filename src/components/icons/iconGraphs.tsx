import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  size?: number;
}

export function IconGraphs(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} stroke={color} viewBox="0 0 20 20" fill="none">
      <Path d="M1 1V19H19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M4.16663 16.1667L9.62117 10.4067L12.8598 13.8267L19.1666 7.16675"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.16663 10.1667L9.62117 4.40675L12.8598 7.82675L19.1666 1.16675"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
