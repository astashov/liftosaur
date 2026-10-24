import { JSX } from "react";
import { IScreenMuscle, ISettings } from "../types";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Svg, Path } from "./primitives/svg";
import { MuscleMapRegions_iconView, MuscleMapRegions_paths } from "../models/muscleMapRegions";

interface IMuscleImageProps {
  muscleGroup: IScreenMuscle;
  settings: ISettings;
  size: number;
}

export function MuscleGroupImage(props: IMuscleImageProps): JSX.Element | null {
  const view = MuscleMapRegions_iconView(props.muscleGroup, props.settings);
  if (view == null) {
    return null;
  }
  const paths = MuscleMapRegions_paths(view.side);
  const [x, y, width, height] = view.viewBox;
  return (
    <Svg viewBox={`${x} ${y} ${width} ${height}`} width={props.size} height={Math.round((props.size * height) / width)}>
      {view.regions.map((region) => (
        <Path
          key={region.key}
          d={paths[region.key].d}
          fill={region.isGroup ? Tailwind_semantic().icon.blue : Tailwind_semantic().icon.light}
        />
      ))}
    </Svg>
  );
}
