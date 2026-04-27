import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

export function useRem(): number {
  return useSyncExternalStore(remSubscribe, remGet, remServerGet);
}

export function Rem_set(size: number): void {
  if (typeof document !== "undefined") {
    document.documentElement.style.fontSize = `${size}px`;
  }
  for (const l of listeners) {
    l();
  }
}

function remGet(): number {
  if (typeof document === "undefined") {
    return 16;
  }
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return isNaN(fs) ? 16 : fs;
}

function remServerGet(): number {
  return 16;
}

function remSubscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
