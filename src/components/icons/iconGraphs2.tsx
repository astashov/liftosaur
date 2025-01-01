import React, { JSX } from "react";
import Svg, { Path } from "react-native-svg";

interface IProps {
  color?: string;
  style?: { [key: string]: string | number };
  size?: number;
}

export function IconGraphs2(props: IProps): JSX.Element {
  const color = props.color || "#3C5063";
  const size = props.size || 20;
  return (
    <Svg style={props.style} className="inline-block" width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M0.833344 0.833252V19.1666H19.1667" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M0.833344 17.4999L7.50001 10.8333L11.4583 14.7916L19.1667 7.08325"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M0.833344 11.2499L7.50001 4.58325L11.4583 8.54159L19.1667 0.833252"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
