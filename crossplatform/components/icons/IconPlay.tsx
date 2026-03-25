import type { JSX } from "react";
import { Svg, Path, Circle } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconPlay(props: IProps): JSX.Element {
  const size = props.size || 19;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none">
      <Circle cx="9.81024" cy="9.79712" r="8" stroke={color} strokeWidth="2" />
      <Path
        d="M14.3102 8.93109C14.9769 9.31599 14.9769 10.2782 14.3102 10.6631L8.31024 14.1272C7.64357 14.5121 6.81024 14.031 6.81024 13.2612L6.81024 6.33302C6.81024 5.56322 7.64358 5.08209 8.31024 5.46699L14.3102 8.93109Z"
        fill={color}
      />
    </Svg>
  );
}
