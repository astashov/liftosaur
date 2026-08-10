import type { JSX } from "react";
import { Svg } from "../primitives/svg";
import type { ISvgComponentProps } from "../primitives/svg";
import { useRem } from "../../utils/useRem";

const BASE_REM = 16;

type IIconSvgProps = ISvgComponentProps & { noRemScale?: boolean };

export function IconSvg(props: IIconSvgProps): JSX.Element {
  const { noRemScale, width, height, ...rest } = props;
  const scale = useRem() / BASE_REM;
  return (
    <Svg
      {...rest}
      width={noRemScale ? width : IconSvg_scale(width, scale)}
      height={noRemScale ? height : IconSvg_scale(height, scale)}
    />
  );
}

export function IconSvg_useScale(): number {
  return useRem() / BASE_REM;
}

function IconSvg_scale(value: ISvgComponentProps["width"], scale: number): ISvgComponentProps["width"] {
  return typeof value === "number" ? Math.round(value * scale) : value;
}
