/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateUtils_formatYYYYMMDDHHMM } from "./date";
import { lg } from "./posthog";

export interface IAsyncQueueOptions {
  timeoutMs?: number;
}

export class AsyncQueueTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = "AsyncQueueTimeoutError";
  }
}

interface IQueueItem {
  key: string;
  deps: any;
  operation: (deps: any, signal: AbortSignal) => Promise<unknown>;
  timeoutMs: number | undefined;
  controller: AbortController;
  enqueuedAt: number;
}

export class AsyncQueue {
  public queue: IQueueItem[] = [];
  public isProcessing = false;
  public readonly defaultTimeoutMs = 120000;
  public currentItem: IQueueItem | null = null;
  public readonly logs: [string, string, Record<string, string | number>][] = [];

  public enqueue<T, V>(
    operation: (deps: V, signal: AbortSignal) => Promise<T>,
    deps?: V,
    options?: IAsyncQueueOptions
  ): Promise<void> {
    const key = JSON.stringify(deps);
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();

    return new Promise<void>((resolve, reject) => {
      const item: IQueueItem = {
        key,
        deps,
        operation: async (d: any, signal: AbortSignal) => {
          try {
            await operation(d, signal);
            if (!signal.aborted) {
              resolve();
            }
          } catch (e) {
            if (!signal.aborted) {
              reject(e);
            }
          }
        },
        timeoutMs,
        controller,
        enqueuedAt: Date.now(),
      };

      this.queue.push(item);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      const item = this.queue.shift();
      this.addLog("processing item", { queueLength: this.queue.length });
      if (item) {
        this.currentItem = item;
        const { deps, operation, timeoutMs, controller } = item;

        if (timeoutMs && timeoutMs > 0) {
          let timeoutId: NodeJS.Timeout | undefined = undefined;

          const timeoutPromise = new Promise<void>((resolve) => {
            timeoutId = setTimeout(() => {
              controller.abort();
              console.error(`AsyncQueue operation timed out after ${timeoutMs}ms`, this.queue.length);
              this.log("async-queue-timeout", {
                timeout: timeoutMs,
                queueLength: this.queue.length,
              });
              resolve();
            }, timeoutMs);
          });

          const operationPromise = operation(deps, controller.signal);

          await Promise.race([operationPromise, timeoutPromise]);
          this.addLog("finish item", { queueLength: this.queue.length });
          if (timeoutId != null) {
            clearTimeout(timeoutId);
          }
        } else {
          await operation(deps, controller.signal);
        }
      }
    } catch (error) {
      throw error;
    } finally {
      this.currentItem = null;
      this.isProcessing = false;
      this.processQueue();
    }
  }

  private log(name: string, extra?: Record<string, string | number>): void {
    this.addLog(name, extra);
    lg(name, extra);
  }

  private addLog(name: string, extra?: Record<string, string | number>): void {
    const currentTime = DateUtils_formatYYYYMMDDHHMM(Date.now(), "-");
    this.logs.push([currentTime, name, extra || {}]);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  public clear(): void {
    for (const item of this.queue) {
      item.controller.abort();
    }
    this.queue = [];
  }

  public length(): number {
    return this.queue.length;
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public clearStaleOperations(): void {
    const now = Date.now();
    this.addLog("clear-stale-operations", { queueLength: this.queue.length });

    if (this.currentItem && this.currentItem.timeoutMs) {
      const elapsed = now - this.currentItem.enqueuedAt;
      if (elapsed > this.currentItem.timeoutMs) {
        console.error(
          `Clearing stale current operation (elapsed: ${elapsed}ms, timeout: ${this.currentItem.timeoutMs}ms)`
        );
        this.log("async-queue-stale-current", {
          elapsed,
          timeout: this.currentItem.timeoutMs,
        });
        this.currentItem.controller.abort();
        this.currentItem = null;
        this.isProcessing = false;
      }
    }

    const staleIndices: number[] = [];
    this.queue.forEach((item, index) => {
      if (item.timeoutMs) {
        const elapsed = now - item.enqueuedAt;
        if (elapsed > item.timeoutMs) {
          console.error(
            `Clearing stale queued operation at index ${index} (elapsed: ${elapsed}ms, timeout: ${item.timeoutMs}ms)`
          );
          this.log("async-queue-stale-queued", {
            elapsed,
            timeout: item.timeoutMs,
            index,
          });
          item.controller.abort();
          staleIndices.push(index);
        }
      }
    });

    for (let i = staleIndices.length - 1; i >= 0; i--) {
      this.queue.splice(staleIndices[i], 1);
    }

    if (!this.isProcessing && this.queue.length > 0) {
      this.processQueue();
    }
  }
}
