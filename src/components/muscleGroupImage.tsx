import { JSX, h } from "preact";
import { IScreenMuscle, screenMuscles } from "../types";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IMuscleImageProps {
  muscleGroup: IScreenMuscle;
  size: number;
}

export function MuscleGroupImage(props: IMuscleImageProps): JSX.Element | null {
  if (!(screenMuscles as readonly string[]).includes(props.muscleGroup)) {
    return null;
  }
  const muscleColors = [
    `--muscle-fill: ${Tailwind_semantic().background.default}`,
    `--muscle-primary: ${Tailwind_semantic().icon.blue}`,
    `--muscle-light: ${Tailwind_semantic().icon.light}`,
  ];
  const width = props.size;
  const height = Math.round((props.size / 61) * 48);

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 48" width={width} height={height}>
      <use
        href={`/images/svgs/musclegroups-combined.svg#${props.muscleGroup.toLowerCase().replace(/ /g, "")}`}
        style={muscleColors.join(";")}
      />
    </svg>
  );
}
