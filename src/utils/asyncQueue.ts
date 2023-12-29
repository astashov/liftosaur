/* eslint-disable @typescript-eslint/no-explicit-any */

export class AsyncQueue {
  private queue: [string, any, (deps: any) => Promise<unknown>][] = [];
  private isProcessing = false;

  public enqueue<T, V>(operation: (deps: V) => Promise<T>, deps?: V): Promise<void> {
    const key = JSON.stringify(deps);
    if (this.queue.length > 0 && this.queue[this.queue.length - 1][0] === key) {
      return Promise.resolve();
    } else {
      return new Promise<void>((resolve) => {
        this.queue.push([
          key,
          deps,
          async (...d) => {
            await operation(...d);
            resolve();
          },
        ]);
        this.processQueue();
      });
    }
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
