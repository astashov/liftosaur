type IGetter<T, R> = (obj: T) => R;
type ISetter<T, R> = (obj: T, value: R) => T;

export type ILensPlay<T> = {
  (obj: T): T;
  toString(): string;
};

export type ILensPlayPayload<T> = {
  fn: ILensPlay<T>;
  str: string;
};

interface IPartialBuilder<T> {
  p: <R extends keyof T>(key: R) => LensBuilder<T, T[R]>;
  i: (index: number) => LensBuilder<T, T extends unknown[] ? T[number] : never>;
}

interface IPartialBuilderWithObject<T> {
  p: <R extends keyof T>(key: R) => LensBuilderWithObject<T, T[R]>;
  i: (index: number) => LensBuilderWithObject<T, T extends unknown[] ? T[number] : never>;
}

abstract class AbstractLensBuilder<T, R> {
  constructor(protected readonly lens: Lens<T, R>) {}

  public get(): Lens<T, R> {
    return this.lens;
  }

  public play(value: R): ILensPlayPayload<T> {
    return Lens.buildLensPlay(this.lens, value);
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
      i: (index: number): LensBuilderWithObject<T, T extends unknown[] ? T[number] : never> => {
        // @ts-ignore
        return new LensBuilderWithObject<T, T[number]>(lensFactory(index), obj);
      },
    };
  }

  public p<K extends keyof R>(key: K): LensBuilderWithObject<T, R[K]> {
    return new LensBuilderWithObject<T, R[K]>(this.lens.then(Lens.prop<R>()(key)), this.obj);
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

export class LensBuilder<T, R> extends AbstractLensBuilder<T, R> {
  constructor(lens: Lens<T, R>) {
    super(lens);
  }

  public static start<T>(lensFactory: <R extends keyof T>(key: R) => Lens<T, T[R]>): IPartialBuilder<T> {
    return {
      p: <R extends keyof T>(key: R): LensBuilder<T, T[R]> => {
        return new LensBuilder<T, T[R]>(lensFactory(key));
      },
      i: (index: number): LensBuilder<T, T extends unknown[] ? T[number] : never> => {
        // @ts-ignore
        return new LensBuilder<T, T[number]>(lensFactory(index));
      },
    };
  }

  public p<K extends keyof R>(key: K): LensBuilder<T, R[K]> {
    return new LensBuilder<T, R[K]>(this.lens.then(Lens.prop<R>()(key)));
  }

  public i(index: number): LensBuilder<T, R extends unknown[] ? R[number] : never> {
    // @ts-ignore
    return new LensBuilder<T, R[number]>(this.lens.then(Lens.index<R>()(index)), this.obj);
  }

  public set(obj: T, value: R): T {
    return this.lens.set(obj, value);
  }

  public modify(obj: T, fn: (value: R) => R): T {
    return this.lens.modify(obj, fn);
  }
}

export function lb<T>(lensFactory?: <R extends keyof T>(key: R) => Lens<T, T[R]>): IPartialBuilder<T>;
export function lb<T, R>(lens: Lens<T, R>): LensBuilder<T, R>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lb(lens: any): any {
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

  public static buildLensPlay<T, R>(aLens: Lens<T, R> | LensBuilder<T, R>, value: R): ILensPlayPayload<T> {
    const lens = aLens instanceof Lens ? aLens : aLens.get();
    const fn: ILensPlay<T> = (obj: T) => {
      return lens.set(obj, value);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    fn.toString = (): string => {
      return `${lens.toString()} = ${value}`;
    };
    return { fn, str: fn.toString() };
  }

  public static build<T>(lensFactory?: <R extends keyof T>(key: R) => Lens<T, T[R]>): IPartialBuilder<T>;
  public static build<T, R>(lens: Lens<T, R>): LensBuilder<T, R>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static build(lens: any): any {
    if (lens == null) {
      return LensBuilder.start(Lens.prop());
    } else if (typeof lens === "function") {
      return LensBuilder.start(lens);
    } else {
      return new LensBuilder(lens);
    }
  }

  public static from<T>(obj: T): IPartialBuilderWithObject<T> {
    return LensBuilderWithObject.start<T>(Lens.prop(), obj);
  }

  private static propKey<T, K extends keyof T>(key: K): Lens<T, T[K]> {
    return new Lens<T, T[K]>(
      (s) => s[key],
      (s, v) => ({ ...s, [key]: v }),
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
