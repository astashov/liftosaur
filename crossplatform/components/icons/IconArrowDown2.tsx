import type { JSX } from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  color?: string;
  style?: Record<string, string | number>;
  className?: string;
}

export function IconArrowDown2(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={13} height={8} className={props.className} style={props.style} viewBox="0 0 13 8" fill="none">
      <Path
        d="M1.5 1.5L6.5 6.5L11.5 1.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
