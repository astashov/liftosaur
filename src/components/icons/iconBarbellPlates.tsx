import type { JSX } from "react";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
  size?: number;
}

export function IconBarbellPlates(props: IProps): JSX.Element {
  const fill = props.color ?? Tailwind_semantic().icon.blue;
  const width = props.size ?? 17;
  return (
    <IconSvg width={width} height={Math.round((width * 14) / 17)} viewBox="0 0 17 14" fill="none">
      <Path d="M5.44872 6.10254H0V7.62818H5.44872V6.10254Z" fill={fill} />
      <Path d="M8.2078 0H9.92114V13.7308H8.2078V0Z" fill={fill} />
      <Path d="M10.4142 1.42163H12.1275V12.3092H10.4142V1.42163Z" fill={fill} />
      <Path d="M12.6206 2.82593H14.3339V10.9049H12.6206V2.82593Z" fill={fill} />
      <Path d="M14.7886 6.11975V7.61072H15.8813H15.9073H17V6.11975H15.9073H15.8813H14.7886Z" fill={fill} />
      <Path d="M6.00144 0H7.71478V13.7308H6.00144V0Z" fill={fill} />
    </IconSvg>
  );
}
