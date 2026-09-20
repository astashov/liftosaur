import type { JSX } from "react";
import { useMemo } from "react";
import { IWeight } from "../types";
import { Svg, Rect } from "./primitives/svg";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useRemScale } from "../utils/useRem";
import { PlatesBarLayout_build } from "../utils/platesBarLayout";

interface IProps {
  plates: IWeight[];
  height?: number;
}

export function PlatesBar(props: IProps): JSX.Element {
  const remScale = useRemScale();
  const layout = useMemo(() => PlatesBarLayout_build(props.plates), [props.plates]);
  const scale = props.height != null ? props.height / layout.height : remScale;
  const colors = Tailwind_semantic();
  return (
    <Svg
      width={Math.round(layout.width * scale)}
      height={Math.round(layout.height * scale)}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      fill="none"
    >
      <Rect {...layout.shaft} fill={colors.plate.bar} />
      <Rect {...layout.collar} rx={1} fill={colors.plate.bar} />
      <Rect {...layout.sleeve} fill={colors.plate.bar} />
      {layout.plates.map((plate, i) => (
        <Rect
          key={i}
          x={plate.x}
          y={plate.y}
          width={plate.width}
          height={plate.height}
          rx={1}
          fill={colors.plate[plate.color]}
          stroke={plate.color === "white" ? colors.plate.whiteoutline : undefined}
          strokeWidth={plate.color === "white" ? 1 : undefined}
        />
      ))}
    </Svg>
  );
}
