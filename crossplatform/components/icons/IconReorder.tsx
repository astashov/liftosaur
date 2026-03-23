import React from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconReorder(props: IProps): React.ReactElement {
  const size = props.size || 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.75 6.375L18.125 3M18.125 3L21.5 6.375M18.125 3L18.125 21M10.25 17.625L6.875 21M6.875 21L3.5 17.625M6.875 21L6.875 3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
