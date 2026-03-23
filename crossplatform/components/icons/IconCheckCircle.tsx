import React from "react";
import { View } from "react-native";
import { Svg, Path } from "react-native-svg";

interface IProps {
  size?: number;
  isChecked: boolean;
  color?: string;
  checkColor?: string;
}

export function IconCheckCircle(props: IProps): React.ReactElement {
  const size = props.size || 20;
  const color = props.color || "#ccc";
  const checkColor = props.checkColor || "#fff";

  if (!props.isChecked) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        }}
      />
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
        fill={color}
      />
      <Path
        d="M14.5 7L8.70846 13L6.5 10.6139"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
