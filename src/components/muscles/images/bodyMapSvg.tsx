import type { JSX } from "react";
import { Svg, Path } from "../../primitives/svg";
import {
  IMuscleMapSide,
  IMuscleStyle,
  MuscleMapRegions_paths,
  MuscleMapRegions_viewBox,
} from "../../../models/muscleMapRegions";

interface IProps {
  side: IMuscleMapSide;
  regions: Partial<Record<string, IMuscleStyle>>;
  baseFill: string;
  baseOpacity: number;
}

export function BodyMapSvg(props: IProps): JSX.Element {
  const paths = MuscleMapRegions_paths(props.side);
  const [x, y, width, height] = MuscleMapRegions_viewBox;
  return (
    <Svg viewBox={`${x} ${y} ${width} ${height}`} width="100%" style={{ aspectRatio: width / height }}>
      {Object.keys(paths).map((key) => (
        <Path key={key} d={paths[key].d} fill={props.baseFill} opacity={props.baseOpacity} />
      ))}
      {Object.keys(props.regions).map((key) => {
        const style = props.regions[key];
        return style && paths[key] ? (
          <Path key={`lit-${key}`} d={paths[key].d} fill={style.fill} opacity={style.opacity} />
        ) : null;
      })}
    </Svg>
  );
}
