import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
  style?: Record<string, unknown>;
}

export function IconArrowDown3(props: IProps): JSX.Element {
  const size = props.size || 18;
  const color = props.color || Tailwind_semantic().icon.purple;
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M16 10.3333L9 17M9 17L2 10.3333M9 17L9 1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
