import { JSX } from "react";
import { SvgXml } from "react-native-svg";
import { IMuscle } from "../types";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { MUSCLE_SPRITES } from "./muscleSpriteData";

interface IMuscleImageProps {
  muscle: IMuscle;
  size: number;
}

function resolveCssVars(svgXml: string): string {
  const colors = Tailwind_semantic();
  return svgXml
    .replace(/var\(--muscle-fill,\s*[^)]*\)/g, colors.background.default)
    .replace(/var\(--muscle-primary,\s*[^)]*\)/g, colors.icon.blue)
    .replace(/var\(--muscle-light,\s*[^)]*\)/g, colors.icon.light);
}

export function MuscleImage(props: IMuscleImageProps): JSX.Element | null {
  const id = props.muscle.toLowerCase().replace(/ /g, "");
  const xml = MUSCLE_SPRITES[id];
  if (!xml) {
    return null;
  }
  const width = props.size;
  const height = Math.round((props.size / 61) * 48);
  return <SvgXml xml={resolveCssVars(xml)} width={width} height={height} />;
}
