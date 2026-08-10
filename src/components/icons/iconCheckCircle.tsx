import { JSX } from "react";
import { View } from "react-native";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { useRemScale } from "../../utils/useRem";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  isChecked: boolean;
  checkColor?: string;
  color?: string;
  style?: { [key: string]: string | number };
  size?: number;
  className?: string;
}

export function IconCheckCircle(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.purple;
  const checkColor = props.checkColor || Tailwind_semantic().background.default;
  const size = props.size || 20;
  const scale = useRemScale();
  if (props.isChecked) {
    return (
      <IconSvg
        style={props.style}
        className={props.className}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
      >
        <Path
          d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
          fill={color}
        />
        <Path
          d="M14.5 7L8.70846 13L6.5 10.6139"
          stroke={checkColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </IconSvg>
    );
  } else {
    const scaledSize = Math.round(size * scale);
    return (
      <View
        style={{
          ...(props.style as object),
          width: scaledSize,
          height: scaledSize,
          borderWidth: 2 * scale,
          borderRadius: scaledSize / 2,
        }}
        className={`${props.className ?? ""} border-bluev2`}
      />
    );
  }
}
