import type { JSX } from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentSmith(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Path d="M6 5L18 5" strokeWidth="1.5" strokeMiterlimit="10" />
      <Path d="M5.98145 2L5.98144 25" strokeWidth="1.5" strokeMiterlimit="10" />
      <Path d="M17.9814 2L17.9814 25" strokeWidth="1.5" strokeMiterlimit="10" />
      <Path
        d="M21.5 12L21.5 14L22.0949 14C22.3186 14 22.5 13.864 22.5 13.6962L22.5 12.3038C22.5 12.136 22.3186 12 22.0949 12L21.5 12Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path
        d="M20 10.8733L20 14.8733L20.6962 14.8733C20.864 14.8733 21 14.7101 21 14.5087L21 11.2379C21 11.0365 20.864 10.8733 20.6962 10.8733L20 10.8733Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path
        d="M2.5 12L2.5 14L1.90511 14C1.68138 14 1.5 13.864 1.5 13.6962L1.5 12.3038C1.5 12.136 1.68138 12 1.90511 12L2.5 12Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path
        d="M4 10.8733L4 14.8733L3.30383 14.8733C3.13603 14.8733 3 14.7101 3 14.5087L3 11.2379C3 11.0365 3.13603 10.8733 3.30383 10.8733L4 10.8733Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path d="M4.37988 12.8733L19.6288 12.8733" strokeWidth="1.5" strokeMiterlimit="10" />
      <Path d="M-0.371582 12.8972L1.42983 12.8972" strokeWidth="1.5" strokeMiterlimit="10" />
      <Path d="M22.5698 12.8972L24.3712 12.8972" strokeWidth="1.5" strokeMiterlimit="10" />
    </Svg>
  );
}
