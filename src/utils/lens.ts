import { ObjectUtils } from "./object";

/* eslint-disable @typescript-eslint/no-explicit-any */
type IGetter<T, R> = (obj: T) => R;
type ISetter<T, R> = (obj: T, value: R) => T;

export type ILensRecording<T> = {
  (obj: T): T;
  toString(): string;
};

export type ILensRecordingPayload<T> = {
  fn: ILensRecording<T>;
  str: string;
  lens: Lens<any, any>;
  lensGetters?: Record<string, Lens<any, any>>;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
type ValueFromLens<T> = T extends Lens<infer A, infer B> ? B : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
type ValuesFromLens<T> = T extends { [P in keyof T]: Lens<any, any> } ? { [P in keyof T]: ValueFromLens<T[P]> } : never;

export type ILensGetters<T> = { [P in string]: Lens<T, any> };

export interface IPartialBuilder<T, U extends ILensGetters<T>> {
  p: <R extends keyof T>(key: R) => LensBuilder<T, T[R], U>;
  pi: <R extends keyof T>(key: R) => LensBuilder<T, Exclude<T[R], undefined>, U>;
  i: (index: number) => LensBuilder<T, T extends unknown[] ? T[number] : never, U>;
  get: () => Lens<T, T>;
}

interface IPartialBuilderWithObject<T> {
  p: <R extends keyof T>(key: R) => LensBuilderWithObject<T, T[R]>;
  pi: <R extends keyof T>(key: R) => LensBuilderWithObject<T, Exclude<T[R], undefined>>;
  i: (index: number) => LensBuilderWithObject<T, T extends unknown[] ? T[number] : never>;
  get: () => Lens<T, T>;
}

abstract class AbstractLensBuilder<T, R> {
  constructor(protected readonly lens: Lens<T, R>) {}

  public get(): Lens<T, R> {
    return this.lens;
  }
}

export class LensBuilderWithObject<T, R> extends AbstractLensBuilder<T, R> {
  constructor(lens: Lens<T, R>, private readonly obj: T) {
    super(lens);
  }

  public static start<T>(
    lensFactory: <R extends keyof T>(key: R) => Lens<T, T[R]>,
    obj: T
  ): IPartialBuilderWithObject<T> {
    return {
      p: <R extends keyof T>(key: R): LensBuilderWithObject<T, T[R]> => {
        return new LensBuilderWithObject<T, T[R]>(lensFactory(key), obj);
      },
      pi: <R extends keyof T>(key: R): LensBuilderWithObject<T, Exclude<T[R], undefined>> => {
        return new LensBuilderWithObject<T, Exclude<T[R], undefined>>(lensFactory(key) as any, obj);
      },
      i: (index: number): LensBuilderWithObject<T, T extends unknown[] ? T[number] : never> => {
        // @ts-ignore
        return new LensBuilderWithObject<T, T[number]>(lensFactory(index), obj);
      },
      get: (): Lens<T, T> => {
        return new Lens(
          (s) => s,
          (s, v) => v,
          { from: "obj", to: "obj" }
        );
      },
    };
  }

  public p<K extends keyof R>(key: K): LensBuilderWithObject<T, R[K]> {
    return new LensBuilderWithObject<T, R[K]>(this.lens.then(Lens.prop<R>()(key)), this.obj);
  }

  public pi<K extends keyof R>(key: K): LensBuilderWithObject<T, Exclude<R[K], undefined>> {
    return new LensBuilderWithObject<T, Exclude<R[K], undefined>>(this.lens.then(Lens.prop<R>()(key) as any), this.obj);
  }

  public i(index: number): LensBuilderWithObject<T, R extends unknown[] ? R[number] : never> {
    // @ts-ignore
    return new LensBuilderWithObject<T, R[number]>(this.lens.then(Lens.index<R>()(index)), this.obj);
  }

  public set(value: R): T {
    return this.lens.set(this.obj, value);
  }

  public modify(fn: (value: R) => R): T {
    return this.lens.modify(this.obj, fn);
  }
}

export class LensBuilder<T, R, U extends ILensGetters<T>> extends AbstractLensBuilder<T, R> {
  constructor(lens: Lens<T, R>, protected readonly lensGetters: U) {
    super(lens);
  }

  public static start<T, U extends ILensGetters<T>>(
    lensFactory: <R extends keyof T>(key: R) => Lens<T, T[R]>,
    lensGetters: U
  ): IPartialBuilder<T, U> {
    return {
      p: <R extends keyof T>(key: R): LensBuilder<T, T[R], U> => {
        return new LensBuilder<T, T[R], U>(lensFactory(key), lensGetters);
      },
      pi: <R extends keyof T>(key: R): LensBuilder<T, Exclude<T[R], undefined>, U> => {
        return new LensBuilder<T, Exclude<T[R], undefined>, U>(lensFactory(key) as any, lensGetters);
      },
      i: (index: number): LensBuilder<T, T extends unknown[] ? T[number] : never, U> => {
        // @ts-ignore
        return new LensBuilder<T, T[number]>(lensFactory(index), lensGetters);
      },
      get: (): Lens<T, T> => {
        return new Lens(
          (s) => s,
          (s, v) => v,
          { from: "obj", to: "obj" }
        );
      },
    };
  }

  public p<K extends keyof R>(key: K): LensBuilder<T, R[K], U> {
    return new LensBuilder<T, R[K], U>(this.lens.then(Lens.prop<R>()(key)), this.lensGetters);
  }

  public i(index: number): LensBuilder<T, R extends unknown[] ? R[number] : never, U> {
    // @ts-ignore
    return new LensBuilder<T, R[number], U>(this.lens.then(Lens.index<R>()(index)), this.lensGetters);
  }

  public pi<K extends keyof R>(key: K): LensBuilder<T, Exclude<R[K], undefined>, U> {
    return new LensBuilder<T, Exclude<R[K], undefined>, U>(
      this.lens.then(Lens.prop<R>()(key) as any),
      this.lensGetters
    );
  }

  public set(obj: T, value: R): T {
    return this.lens.set(obj, value);
  }

  public modify(obj: T, fn: (value: R) => R): T {
    return this.lens.modify(obj, fn);
  }

  public record(value: R): ILensRecordingPayload<T> {
    return Lens.buildLensRecording(this.lens, value);
  }

  public recordModify(fn: (v: R, getters: ValuesFromLens<U>) => R): ILensRecordingPayload<T> {
    return Lens.buildLensModifyRecording(this.lens, fn, this.lensGetters);
  }
}

export function lb<T>(): IPartialBuilder<T, {}> {
  return Lens.build({});
}

export function lbu<T, U extends ILensGetters<T>>(lens: U): IPartialBuilder<T, U> {
  return Lens.build(lens);
}

export function lf<T>(obj: T): IPartialBuilderWithObject<T> {
  return Lens.from(obj);
}

export class Lens<T, R> {
  public readonly get: IGetter<T, R>;
  public readonly set: ISetter<T, R>;
  public readonly from: string;
  public readonly to: string;

  public static buildLensModifyRecording<T, R, U extends ILensGetters<T>>(
    aLens: Lens<T, R> | LensBuilder<T, R, U>,
    modifyFn: <Z extends ValuesFromLens<U>>(v: R, getters: Z) => R,
    lensGetters: U
  ): ILensRecordingPayload<T> {
    const lens = aLens instanceof Lens ? aLens : aLens.get();
    const fn: ILensRecording<T> = (obj: T) => {
      const getters = ObjectUtils.keys(lensGetters).reduce<ValuesFromLens<U>>((memo, key) => {
        // @ts-ignore
        memo[key] = lensGetters[key].get(obj) as any;
        return memo;
      }, {} as any);
      return lens.modify(obj, (v) => modifyFn(v, getters));
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    fn.toString = (): string => {
      return `${lens.toString()} = \`modify\``;
    };
    return { fn, str: fn.toString(), lens, lensGetters };
  }

  public static buildLensRecording<T, R>(
    aLens: Lens<T, R> | LensBuilder<T, R, {}>,
    value: R
  ): ILensRecordingPayload<T> {
    const lens = aLens instanceof Lens ? aLens : aLens.get();
    const fn: ILensRecording<T> = (obj: T) => {
      return lens.set(obj, value);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    fn.toString = (): string => {
      return `${lens.toString()} = ${value}`;
    };
    return { fn, str: fn.toString(), lens };
  }

  public static build<T, U extends ILensGetters<T>>(lens: U): IPartialBuilder<T, U> {
    return LensBuilder.start(Lens.prop(), lens);
  }

  public static from<T>(obj: T): IPartialBuilderWithObject<T> {
    return LensBuilderWithObject.start<T>(Lens.prop(), obj);
  }

  private static propKey<T, K extends keyof T>(key: K): Lens<T, T[K]> {
    return new Lens<T, T[K]>(
      (s) => s[key],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s, v) => (Array.isArray(s) ? (s.map((e, i) => (i === key ? v : e)) as any) : { ...s, [key]: v }),
      { from: "obj", to: `${key}` }
    );
  }

  public static prop<T>(): <K extends keyof T>(key: K) => Lens<T, T[K]> {
    return <K extends keyof T>(key: K) => Lens.propKey(key);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static index<T extends any[]>(): (index: number) => Lens<T, T[number]> {
    return (index: number) => {
      return new Lens<T, T[keyof T]>(
        (a) => a[index],
        (a, v) => a.map((e, i) => (i === index ? v : e)) as T,
        { from: "obj", to: `${index}` }
      );
    };
  }

  constructor(getter: IGetter<T, R>, setter: ISetter<T, R>, args: { from: string; to: string }) {
    this.get = getter;
    this.set = setter;
    this.from = args.from;
    this.to = args.to;
  }

  public modify(obj: T, f: (value: R) => R): T {
    return this.set(obj, f(this.get(obj)));
  }

  public then<V>(lens: Lens<R, V>): Lens<T, V> {
    return new Lens(
      (obj) => {
        const nextObj = this.get(obj);
        return lens.get(nextObj);
      },
      (obj, value) => {
        const parent = this.get(obj);
        const newParent = lens.set(parent, value);
        const newObj = this.set(obj, newParent);
        return newObj;
      },
      {
        from: this.toString(),
        to: lens.to,
      }
    );
  }

  public toString(): string {
    if (this.from != null && this.to != null) {
      return `${this.from} -> ${this.to}`;
    } else {
      return "Lens";
    }
  }
}
