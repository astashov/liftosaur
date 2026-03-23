import React from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconShare(props: IProps): React.ReactElement {
  const size = props.size || 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13.6306V17.7714C5 18.2395 5.18437 18.6883 5.51256 19.0193C5.84075 19.3502 6.28587 19.5361 6.75 19.5361H17.25C17.7141 19.5361 18.1592 19.3502 18.4874 19.0193C18.8156 18.6883 19 18.2395 19 17.7714V13.6306M12.0361 15.5165L12.0361 4.46387M12.0361 4.46387L8.03613 8.28483M12.0361 4.46387L16.0361 8.28483"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
