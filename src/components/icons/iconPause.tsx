import type { JSX } from "react";
import { Svg, Circle, Rect } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  className?: string;
  color?: string;
}

export function IconPause(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  const size = props.size || 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none" className={props.className}>
      <Circle cx={9.81024} cy={9.79712} r={8} stroke={color} strokeWidth={2} />
      <Rect x={7.31024} y={6.29712} width={1} height={7} rx={0.5} fill={color} stroke={color} />
      <Rect x={11.3102} y={6.29712} width={1} height={7} rx={0.5} fill={color} stroke={color} />
    </Svg>
  );
}
