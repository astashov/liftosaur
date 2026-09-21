import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let activeId: string | null = null;
let height = 0;

export function KeyboardActiveId_set(id: string | null): void {
  if (activeId === id) {
    return;
  }
  activeId = id;
  for (const listener of listeners) {
    listener();
  }
}

export function KeyboardActiveId_get(): string | null {
  return activeId;
}

export function KeyboardActiveId_setHeight(value: number): void {
  if (height === value) {
    return;
  }
  height = value;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const KeyboardActiveId_subscribe = subscribe;

export function useIsKeyboardActive(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => activeId === id,
    () => false
  );
}

export function useKeyboardHeightIfActive(id: string): number {
  return useSyncExternalStore(
    subscribe,
    () => (activeId === id ? height : 0),
    () => 0
  );
}
