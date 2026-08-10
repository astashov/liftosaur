import type { JSX } from "react";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function IconArrowRight(props: IProps): JSX.Element {
  const width = props.width || 7;
  const height = props.height || 12;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <IconSvg width={width} height={height} viewBox="0 0 7 12" fill="none">
      <Path d="M1 1L6 6L1 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  );
}
