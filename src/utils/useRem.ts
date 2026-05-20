import { useSyncExternalStore } from "react";

const BASE_REM = 16;
const listeners = new Set<() => void>();

export function useRem(): number {
  return useSyncExternalStore(remSubscribe, remGet, remServerGet);
}

export function Rem_set(size: number): void {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.fontSize = `${size}px`;
    const scale = size / BASE_REM;
    const vars: Record<string, string> = {
      "--spacing": `${4 * scale}px`,
      "--text-xs": `${12 * scale}px`,
      "--text-sm": `${14 * scale}px`,
      "--text-base": `${16 * scale}px`,
      "--text-lg": `${18 * scale}px`,
      "--text-xl": `${20 * scale}px`,
      "--text-2xl": `${24 * scale}px`,
      "--text-3xl": `${30 * scale}px`,
      "--text-4xl": `${36 * scale}px`,
      "--text-5xl": `${48 * scale}px`,
    };
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  }
  for (const l of listeners) {
    l();
  }
}

function remGet(): number {
  if (typeof document === "undefined") {
    return BASE_REM;
  }
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return isNaN(fs) ? BASE_REM : fs;
}

function remServerGet(): number {
  return BASE_REM;
}

function remSubscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
