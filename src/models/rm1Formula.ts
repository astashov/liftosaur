import { I1RMFormula, ISettings } from "../types";
import { Weight_rpeMultiplier } from "./weight";

const PREVIEW_REPS = [5, 10, 15];

export function Rm1Formula_fromSettings(settings: Pick<ISettings, "rm1formula">): I1RMFormula {
  return settings.rm1formula ?? "rts";
}

export function Rm1Formula_name(formula: I1RMFormula): string {
  switch (formula) {
    case "rts":
      return "RTS (Tuchscherer)";
    case "epley":
      return "Epley";
    case "brzycki":
      return "Brzycki";
  }
}

export function Rm1Formula_preview(formula: I1RMFormula): { reps: number; pct: number }[] {
  return PREVIEW_REPS.map((reps) => ({ reps, pct: Math.round(Weight_rpeMultiplier(reps, 10, formula) * 100) }));
}

export function Rm1Formula_previewText(formula: I1RMFormula): string {
  return Rm1Formula_preview(formula)
    .map(({ reps, pct }) => `${reps} reps: ${pct}%`)
    .join(" · ");
}
