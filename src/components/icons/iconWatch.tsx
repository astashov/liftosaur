import type { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  style?: Record<string, unknown>;
}

export function IconWatch(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  const width = props.width || 17;
  const height = props.height || 22;
  return (
    <Svg width={width} height={height} viewBox="0 0 17 22" fill="none">
      <Path
        d="M12.187 6.72466L13.2643 5.24117M6.58297 3.66675H10.2496M8.41667 8.2493V11.9167H12.0833M14.8333 11.9167C14.8333 15.4606 11.9605 18.3334 8.41667 18.3334C4.87283 18.3334 2 15.4606 2 11.9167C2 8.37291 4.87283 5.50008 8.41667 5.50008C11.9605 5.50008 14.8333 8.37291 14.8333 11.9167Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
