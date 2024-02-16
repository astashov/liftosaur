/* eslint-disable @typescript-eslint/no-explicit-any */

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let lastTs: number | undefined;
  let lastRan: number | undefined;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();

    if (!lastRan || now - lastRan >= limit) {
      if (lastTs) {
        window.clearTimeout(lastTs);
        lastTs = undefined;
      }
      func.apply(context, args);
      lastRan = now;
    } else {
      if (lastTs) {
        window.clearTimeout(lastTs);
      }
      lastTs = window.setTimeout(() => {
        func.apply(context, args);
        lastRan = Date.now();
      }, limit - (now - (lastRan || 0)));
    }
  };
}
