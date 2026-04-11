import { colorScheme } from "nativewind";
import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";

type IBaseColors = typeof baseColors;
type ISemanticColors = typeof semanticColors;

export function Tailwind_colors(): IBaseColors {
  return baseColors;
}

export function Tailwind_semantic(): ISemanticColors["light"] {
  const theme = colorScheme.get() === "dark" ? "dark" : "light";
  return semanticColors[theme];
}
