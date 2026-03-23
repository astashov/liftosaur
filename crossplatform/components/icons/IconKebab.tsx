import React from "react";
import { Svg, Circle } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconKebab(props: IProps): React.ReactElement {
  const width = props.size || 16;
  const height = Math.round(width / 4);
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={width} height={height} viewBox="0 0 16 4" fill="none">
      <Circle cx="2" cy="2" r="2" fill={color} />
      <Circle cx="8" cy="2" r="2" fill={color} />
      <Circle cx="14" cy="2" r="2" fill={color} />
    </Svg>
  );
}
