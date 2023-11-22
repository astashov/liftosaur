export class AsyncQueue {
  private queue: (() => Promise<unknown>)[] = [];
  private isProcessing = false;

  public enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      this.queue.push(async () => {
        const result = await operation();
        resolve(result);
        return result;
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
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
