/* eslint-disable @typescript-eslint/no-explicit-any */

export class AsyncQueue {
  private queue: [string, any, (deps: any) => Promise<unknown>][] = [];
  private isProcessing = false;

  public enqueue<T, V>(operation: (deps: V) => Promise<T>, deps?: V): Promise<void> {
    const key = JSON.stringify(deps);
    return new Promise<void>((resolve, reject) => {
      this.queue.push([
        key,
        deps,
        async (...d) => {
          try {
            await operation(...d);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      ]);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      const pair = this.queue.shift();
      if (pair) {
        const [_, deps, operation] = pair;
        await operation(deps);
      }
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  public clear(): void {
    this.queue = [];
  }
}
