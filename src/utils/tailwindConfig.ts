import baseColors from "../../tailwind.colors.json";
import semanticColors from "../../tailwind.semantic.generated.json";

type IBaseColors = typeof baseColors;
type ISemanticColors = typeof semanticColors;

export class Tailwind {
  public static colors(): IBaseColors {
    return baseColors;
  }

  public static semantic(): ISemanticColors["light"] {
    const theme = typeof window !== "undefined" && window.document.body.classList.contains("dark") ? "dark" : "light";
    return semanticColors[theme];
  }
}
