import type { JSX } from "react";
import { Svg, Path, Rect, Line } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentLeverageMachineProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentLeverageMachine(props: IIconEquipmentLeverageMachineProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Rect x="7.75" y="5.75" width="7.5" height="11.5" strokeWidth="1.5" />
      <Rect width="8" height="3" rx="1" transform="matrix(1 0 0 -1 7.5 20)" strokeWidth="1.5" />
      <Line
        y1="-0.75"
        x2="5"
        y2="-0.75"
        transform="matrix(-3.68525e-08 -1 -1 5.18468e-08 9.2998 24.615)"
        strokeWidth="1.5"
      />
      <Line
        y1="-0.75"
        x2="5"
        y2="-0.75"
        transform="matrix(-3.68525e-08 -1 -1 5.18468e-08 12.2998 24.615)"
        strokeWidth="1.5"
      />
      <Path d="M6.20318 8.11542L1.96191 15.5745" strokeWidth="1.5" />
      <Path d="M16.7499 8.11542L20.9912 15.5745" strokeWidth="1.5" />
      <Path d="M4 2L3.99857 12" strokeWidth="1.5" strokeMiterlimit="10" />
      <Line x1="19.3676" y1="11.3816" x2="22.5756" y2="9.17996" strokeWidth="1.5" />
      <Line
        y1="-0.75"
        x2="3.89084"
        y2="-0.75"
        transform="matrix(-0.824503 -0.565858 -0.565858 0.824503 3.19971 12)"
        strokeWidth="1.5"
      />
      <Path d="M19 2L19 12" strokeWidth="1.5" strokeMiterlimit="10" />
    </Svg>
  );
}
