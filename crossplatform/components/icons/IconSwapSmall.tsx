import type { JSX } from "react";
import { Svg, Path } from "react-native-svg";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconSwapSmall(props: IProps): JSX.Element {
  const size = props.size || 12;
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} className={props.className} viewBox="0 0 12 12" fill="none">
      <Path
        d="M9.71106 4.00694C9.01609 2.80719 7.71714 2 6.22939 2C4.54256 2 3.09843 3.03768 2.50217 4.50868M8.4903 4.50868H10.5V2.50174M2.78894 8.02083C3.48391 9.22059 4.78286 10.0278 6.27061 10.0278C7.95744 10.0278 9.40157 8.9901 9.99783 7.5191M4.0097 7.5191H2V9.52604"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
