import type { JSX } from "react";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  isOpen?: boolean;
  className?: string;
}

export function IconSidePanel(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <IconSvg width={size} height={size} className={props.className} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 3.5H19C19.8284 3.5 20.5 4.17157 20.5 5V19C20.5 19.8284 19.8284 20.5 19 20.5H5C4.17157 20.5 3.5 19.8284 3.5 19V5C3.5 4.17157 4.17157 3.5 5 3.5Z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M9 3.5V20.5" stroke={color} strokeWidth={1.5} />
      <Path
        d={props.isOpen ? "M13 9L16 12L13 15" : "M16 9L13 12L16 15"}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}
