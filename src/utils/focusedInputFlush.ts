let currentFlushCallback: (() => void) | null = null;

export function FocusedInputFlush_register(cb: () => void): void {
  currentFlushCallback = cb;
}

export function FocusedInputFlush_unregister(cb: () => void): void {
  if (currentFlushCallback === cb) {
    currentFlushCallback = null;
  }
}

export function FocusedInputFlush_flush(): void {
  if (currentFlushCallback) {
    currentFlushCallback();
  }
}
