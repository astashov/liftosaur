import { useSyncExternalStore } from "react";
import { Uniwind } from "uniwind";

const BASE_REM = 16;
let currentRem = BASE_REM;
const subscribers = new Set<() => void>();

export function useRem(): number {
  return useSyncExternalStore(subscribe, () => currentRem, () => currentRem);
}

export function Rem_set(size: number): void {
  if (size === currentRem) return;
  currentRem = size;
  const scale = size / BASE_REM;
  Uniwind.updateCSSVariables(Uniwind.currentTheme, {
    "--spacing": 4 * scale,
    "--text-xs": 12 * scale,
    "--text-sm": 14 * scale,
    "--text-base": 16 * scale,
    "--text-lg": 18 * scale,
    "--text-xl": 20 * scale,
    "--text-2xl": 24 * scale,
    "--text-3xl": 30 * scale,
    "--text-4xl": 36 * scale,
    "--text-5xl": 48 * scale,
  } as Record<string, number>);
  subscribers.forEach((cb) => cb());
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}
