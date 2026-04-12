import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconCalendarSmall(props: IProps): JSX.Element {
  const size = props.size ?? 14;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 14 14" fill="none">
      <Path
        d="M10.1529 3.2428H3.74706C2.78218 3.2428 2 4.07387 2 5.09905V11.2865C2 12.3117 2.78218 13.1428 3.74706 13.1428H10.1529C11.1178 13.1428 11.9 12.3117 11.9 11.2865V5.09905C11.9 4.07387 11.1178 3.2428 10.1529 3.2428Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M2 6.54285H11.9" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.2002 2.14282V4.34282" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.7002 2.14282V4.34282" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
