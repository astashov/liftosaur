let isUndoingRef = false;

export function UndoingFlag_set(value: boolean): void {
  isUndoingRef = value;
  if (typeof window !== "undefined") {
    window.isUndoing = value;
  }
}

export function UndoingFlag_get(): boolean {
  if (typeof window !== "undefined" && window.isUndoing != null) {
    return window.isUndoing;
  }
  return isUndoingRef;
}
