import { colorScheme } from "nativewind";

export function Theme_apply(theme: "dark" | "light"): void {
  colorScheme.set(theme);
}
