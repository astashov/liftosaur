import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";

type IBaseColors = typeof baseColors;
type ISemanticColors = typeof semanticColors;

let _themeDetector: () => "light" | "dark" = () => {
  return typeof document !== "undefined" && document.body?.classList?.contains("dark") ? "dark" : "light";
};

export function Tailwind_setThemeDetector(fn: () => "light" | "dark"): void {
  _themeDetector = fn;
}

export function Tailwind_colors(): IBaseColors {
  return baseColors;
}

export function Tailwind_semantic(): ISemanticColors["light"] {
  return semanticColors[_themeDetector()];
}
