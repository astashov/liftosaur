import { useSyncExternalStore } from "react";
import { rem } from "nativewind";

export function useRem(): number {
  return useSyncExternalStore(remSubscribe, remGet, remGet);
}

export function Rem_set(size: number): void {
  rem.set(size);
}

function remGet(): number {
  return rem.get();
}

function remSubscribe(onChange: () => void): () => void {
  const effect = { run: onChange, dependencies: new Set<() => void>() };
  rem.get(effect);
  return () => {
    for (const cleanup of Array.from(effect.dependencies)) {
      cleanup();
    }
    effect.dependencies.clear();
  };
}
