import { JSX } from "react";
import { SvgXml } from "react-native-svg";
import { IScreenMuscle, screenMuscles } from "../types";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { MUSCLE_GROUP_SPRITES } from "./muscleGroupSpriteData";

interface IMuscleImageProps {
  muscleGroup: IScreenMuscle;
  size: number;
}

function resolveCssVars(svgXml: string): string {
  const colors = Tailwind_semantic();
  return svgXml
    .replace(/var\(--muscle-fill,\s*[^)]*\)/g, colors.background.default)
    .replace(/var\(--muscle-primary,\s*[^)]*\)/g, colors.icon.blue)
    .replace(/var\(--muscle-light,\s*[^)]*\)/g, colors.icon.light);
}

export function MuscleGroupImage(props: IMuscleImageProps): JSX.Element | null {
  if (!(screenMuscles as readonly string[]).includes(props.muscleGroup)) {
    return null;
  }
  const id = props.muscleGroup.toLowerCase().replace(/ /g, "");
  const xml = MUSCLE_GROUP_SPRITES[id];
  if (!xml) {
    return null;
  }
  const width = props.size;
  const height = Math.round((props.size / 61) * 48);
  return <SvgXml xml={resolveCssVars(xml)} width={width} height={height} />;
}
