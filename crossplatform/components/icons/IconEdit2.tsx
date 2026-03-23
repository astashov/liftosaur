import React from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconEdit2(props: IProps): React.ReactElement {
  const size = props.size || 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.4486 6.95168L17.0486 10.5517M4.44867 19.5517L8.81465 18.672C9.04643 18.6253 9.25925 18.5111 9.42639 18.3439L19.2001 8.56486C19.6687 8.096 19.6683 7.33602 19.1993 6.86755L17.1289 4.79948C16.6601 4.33121 15.9005 4.33153 15.4321 4.80019L5.65743 14.5802C5.49062 14.7471 5.37672 14.9595 5.32997 15.1908L4.44867 19.5517Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
