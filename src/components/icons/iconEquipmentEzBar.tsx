import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentEzBarProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentEzBar(props: IIconEquipmentEzBarProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Path
        d="M8 11.9556H12.1312C12.2608 11.9556 12.3854 12.0059 12.4787 12.0961L15.6527 15.1643C15.8464 15.3516 16.1537 15.3517 16.3475 15.1646L19.5223 12.1001C19.6155 12.0102 19.7399 11.9599 19.8693 11.9599L29.8889 11.9556"
        strokeWidth="1.5"
      />
      <Path
        d="M5 8L5 16L3.21533 16C2.54413 16 2 15.4559 2 14.7847L2 9.21533C2 8.54413 2.54413 8 3.21533 8L5 8Z"
        fill="#FAF8FF"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path
        d="M8 6L8 12L8 18L5.9115 18C5.4081 18 5 17.5103 5 16.9062L5 7.0938C5 6.48972 5.4081 6 5.9115 6L8 6Z"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <Path d="M-2 12.053L1.98113 12.053" strokeWidth="2" strokeMiterlimit="10" />
    </Svg>
  );
}
