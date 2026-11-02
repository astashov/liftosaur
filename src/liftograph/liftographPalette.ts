import { Tailwind_semantic } from "../utils/tailwindConfig";

export interface ILiftographPaletteEntry {
  stroke: string;
  text: string;
}

export const LiftographPalette_names = ["purple", "blue", "red", "green", "orange", "gray"] as const;
const names = LiftographPalette_names;

function entries(): Record<(typeof names)[number], ILiftographPaletteEntry> {
  const semantic = Tailwind_semantic();
  return {
    purple: { stroke: semantic.graph.purple, text: semantic.text.purple },
    blue: { stroke: semantic.graph.blue, text: semantic.text.link },
    red: { stroke: semantic.graph.red, text: semantic.text.error },
    green: { stroke: semantic.text.success, text: semantic.text.success },
    orange: { stroke: semantic.graph.orange, text: semantic.text.cardyellowsubtle },
    gray: { stroke: semantic.text.secondary, text: semantic.text.secondary },
  };
}

export function LiftographPalette_entry(color: string | undefined, index: number): ILiftographPaletteEntry {
  const palette = entries();
  const named = names.find((name) => name === color);
  return palette[named ?? names[index % names.length]];
}
