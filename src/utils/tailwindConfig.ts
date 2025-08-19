import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";

type BaseColors = typeof baseColors;
type SemanticColors = typeof semanticColors;

export class Tailwind {
  public static colors(): BaseColors {
    return baseColors;
  }

  public static semantic(): SemanticColors["light"] {
    const theme = typeof window !== "undefined" && window.document.body.classList.contains("dark") ? "dark" : "light";
    return semanticColors[theme];
  }
}
