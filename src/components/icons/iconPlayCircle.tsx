import { JSX } from "react";
import { Svg, Path } from "../primitives/svg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  playColor?: string;
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
}

export function IconPlayCircle(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.purple;
  const playColor = props.playColor || Tailwind_semantic().background.default;
  const size = props.size || 20;
  return (
    <Svg style={props.style} className={props.className} width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
        fill={color}
      />
      <Path d="M8 6.5L14 10L8 13.5V6.5Z" fill={playColor} stroke={playColor} strokeWidth="1.5" strokeLinejoin="round" />
    </Svg>
  );
}
