import type { JSX } from "react";
import { Svg, Path, Circle } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconFilter(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx={34} cy={9} r={5} stroke={color} strokeWidth={2} />
      <Circle cx={14} cy={24} r={5} stroke={color} strokeWidth={2} />
      <Circle cx={27} cy={39} r={5} stroke={color} strokeWidth={2} />
      <Path d="M3 9H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 24L9 24" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M43 39H32" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 39L13 39" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M39 9L45 9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M43 24H27" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
