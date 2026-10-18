import type { JSX } from "react";
import { Rect } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IIconEquipmentBandProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconEquipmentBand(props: IIconEquipmentBandProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <IconSvg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="2.75" width="5" height="18.5" rx="2.5" stroke={color} strokeWidth="1.5" />
      <Rect x="13" y="2.75" width="5" height="18.5" rx="2.5" stroke={color} strokeWidth="1.5" />
    </IconSvg>
  );
}
