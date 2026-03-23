import React from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  style?: Record<string, string | number>;
  className?: string;
}

export function IconArrowDown3(props: IProps): React.ReactElement {
  const size = props.size || 18;
  const color = props.color || Tailwind_semantic().text.purple;
  return (
    <Svg width={size} height={size} className={props.className} style={props.style} viewBox="0 0 18 18" fill="none">
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
