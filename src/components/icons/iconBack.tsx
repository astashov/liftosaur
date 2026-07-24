import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  color?: string;
}

export function IconBack(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={15} height={22} viewBox="0 0 15 22">
      <Path d="M13 2L3 10.9041L13 20" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
