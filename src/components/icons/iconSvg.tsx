import type { JSX } from "react";
import { Svg } from "../primitives/svg";
import type { ISvgComponentProps } from "../primitives/svg";
import { useRemScale } from "../../utils/useRem";

type IIconSvgProps = ISvgComponentProps & { noRemScale?: boolean };

export function IconSvg(props: IIconSvgProps): JSX.Element {
  const { noRemScale, width, height, ...rest } = props;
  const scale = useRemScale();
  return (
    <Svg
      {...rest}
      width={noRemScale ? width : IconSvg_scale(width, scale)}
      height={noRemScale ? height : IconSvg_scale(height, scale)}
    />
  );
}

function IconSvg_scale(value: ISvgComponentProps["width"], scale: number): ISvgComponentProps["width"] {
  return typeof value === "number" ? Math.round(value * scale) : value;
}
