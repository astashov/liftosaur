import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";

type IBaseColors = typeof baseColors;
type ISemanticColors = typeof semanticColors;
type IDeepString<T> = { [K in keyof T]: T[K] extends object ? IDeepString<T[K]> : string };
type ISemanticVars = IDeepString<ISemanticColors["light"]>;

export const TAILWIND_PAGE_MARKER_CLASS = "liftosaur-page";

let isPageRenderContext = false;

export function Tailwind_markPageContext(): void {
  isPageRenderContext = true;
}

export function Tailwind_colors(): IBaseColors {
  return baseColors;
}

function buildSemanticVars(): ISemanticVars {
  const shape = semanticColors.light as Record<string, Record<string, string>>;
  const result: Record<string, Record<string, string>> = {};
  for (const category of Object.keys(shape)) {
    const inner: Record<string, string> = {};
    for (const name of Object.keys(shape[category])) {
      inner[name] = `var(--color-${category}-${name})`;
    }
    result[category] = inner;
  }
  return result as unknown as ISemanticVars;
}

const semanticVars: ISemanticVars = buildSemanticVars();

export function Tailwind_semantic(): ISemanticVars {
  if (isPageRenderContext) {
    return semanticVars;
  }
  if (typeof window === "undefined") {
    return semanticColors.light as unknown as ISemanticVars;
  }
  const root = window.document.documentElement;
  if (root.classList.contains(TAILWIND_PAGE_MARKER_CLASS)) {
    return semanticVars;
  }
  const theme = root.classList.contains("dark") ? "dark" : "light";
  return semanticColors[theme] as unknown as ISemanticVars;
}

export function Tailwind_semanticConcrete(): ISemanticVars {
  return semanticColors.light as unknown as ISemanticVars;
}
