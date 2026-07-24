import type { JSX } from "react";
import { Svg, Circle } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  className?: string;
}

export function IconKebab(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={16} height={4} viewBox="0 0 16 4" fill="none" className={props.className}>
      <Circle cx={8} cy={2} r={2} fill={color} />
      <Circle cx={2} cy={2} r={2} fill={color} />
      <Circle cx={14} cy={2} r={2} fill={color} />
    </Svg>
  );
}
