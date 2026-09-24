const g = globalThis as unknown as { __pendingFrames?: Set<number> };

export function FrameLoop_track(): void {
  const pending = new Set<number>();
  g.__pendingFrames = pending;
  const request = globalThis.requestAnimationFrame;
  const cancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = request((time) => {
      pending.delete(id);
      callback(time);
    });
    pending.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id: number): void => {
    pending.delete(id);
    cancel(id);
  };
}

export function FrameLoop_cancelAll(): void {
  const pending = g.__pendingFrames;
  if (pending == null) {
    return;
  }
  for (const id of Array.from(pending)) {
    globalThis.cancelAnimationFrame(id);
  }
  pending.clear();
}
