import type { JSX } from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentBarbell(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Path
        d="M6 8L6 16L4.21533 16C3.54413 16 3 15.4559 3 14.7847L3 9.21533C3 8.54413 3.54413 8 4.21533 8L6 8Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path
        d="M9 6L9 18L6.9115 18C6.4081 18 6 17.5103 6 16.9062L6 7.0938C6 6.48972 6.4081 6 6.9115 6L9 6Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path d="M-1 12.053L2.98113 12.053" strokeWidth="2" strokeMiterlimit="10" />
      <Path d="M9.5 12L25 12" strokeWidth="2" strokeMiterlimit="10" />
    </Svg>
  );
}
