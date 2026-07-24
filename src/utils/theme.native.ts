import { Uniwind } from "uniwind";

export function Theme_apply(theme: "dark" | "light"): void {
  Uniwind.setTheme(theme);
}
