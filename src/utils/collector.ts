/* eslint-disable @typescript-eslint/no-explicit-any */

export type ICollectorFn<T, U> = { fn: (acc: U, item: T) => U; initial: U };

type IValuesFromCallbacks<V> = V extends [infer A, ...(infer B)]
  ? A extends ICollectorFn<any, infer C>
    ? [C, ...IValuesFromCallbacks<B>]
    : never
  : [];

export class Collector<ItemType, T extends ICollectorFn<ItemType, any>[] = []> {
  private readonly callbacks: T;

  public static build<IT>(items: IT[]): Collector<IT> {
    return new Collector(items, []);
  }

  private constructor(private readonly collection: ItemType[], callbacks: T) {
    this.callbacks = callbacks;
  }

  public addFn<U>(
    callback: ICollectorFn<ItemType, U>
  ): Collector<ItemType, T extends never[] ? [ICollectorFn<ItemType, U>] : [...T, ICollectorFn<ItemType, U>]> {
    return new Collector(this.collection, [...this.callbacks, callback]) as any;
  }

  public add<U>(
    fn: ICollectorFn<ItemType, U>["fn"],
    initial: U
  ): Collector<ItemType, T extends never[] ? [ICollectorFn<ItemType, U>] : [...T, ICollectorFn<ItemType, U>]> {
    const callback = { fn, initial };
    return new Collector(this.collection, [...this.callbacks, callback]) as any;
  }

  public run(): IValuesFromCallbacks<T> {
    const values = this.callbacks.map((callback) => callback.initial);
    for (const item of this.collection) {
      for (let i = 0; i < this.callbacks.length; i += 1) {
        values[i] = this.callbacks[i].fn(values[i], item);
      }
    }
    return values as any;
  }
}
