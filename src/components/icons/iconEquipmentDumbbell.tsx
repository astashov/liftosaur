import type { JSX } from "react";
import { Svg, Rect } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentDumbbellProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentDumbbell(props: IIconEquipmentDumbbellProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="10.3" width="22" height="4.4" rx="1" stroke={color} strokeWidth="1.5" />
      <Rect x="3.2002" y="7" width="5.5" height="11" rx="1" fill="#FAF8FF" stroke={color} strokeWidth="1.5" />
      <Rect x="15.2998" y="7" width="5.5" height="11" rx="1" fill="#FAF8FF" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}
