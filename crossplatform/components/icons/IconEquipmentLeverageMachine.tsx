import type { JSX } from "react";
import { Svg, Path, Rect, Line } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentLeverageMachine(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Rect x="7.75" y="5.75" width="7.5" height="11.5" strokeWidth="1.5" />
      <Rect x="7.5" y="17" width="8" height="3" rx="1" strokeWidth="1.5" />
      <Line x1="9.3" y1="19.615" x2="9.3" y2="24.615" strokeWidth="1.5" />
      <Line x1="12.3" y1="19.615" x2="12.3" y2="24.615" strokeWidth="1.5" />
      <Path d="M6.20318 8.11542L1.96191 15.5745" strokeWidth="1.5" />
      <Path d="M16.7499 8.11542L20.9912 15.5745" strokeWidth="1.5" />
      <Path d="M4 2L3.99857 12" strokeWidth="1.5" strokeMiterlimit="10" />
      <Line x1="19.3676" y1="11.3816" x2="22.5756" y2="9.17996" strokeWidth="1.5" />
      <Path d="M3.2 12L0 9.8" strokeWidth="1.5" />
      <Path d="M19 2L19 12" strokeWidth="1.5" strokeMiterlimit="10" />
    </Svg>
  );
}
