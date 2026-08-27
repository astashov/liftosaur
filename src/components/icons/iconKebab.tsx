import type { JSX } from "react";
import { Circle } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  className?: string;
  isVertical?: boolean;
}

export function IconKebab(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  const isVertical = !!props.isVertical;
  const width = isVertical ? 4 : 16;
  const height = isVertical ? 16 : 4;
  return (
    <IconSvg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className={props.className}>
      {[2, 8, 14].map((along) => (
        <Circle key={along} cx={isVertical ? 2 : along} cy={isVertical ? along : 2} r={2} fill={color} />
      ))}
    </IconSvg>
  );
}
