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

export class Lens<T, R> {
  private readonly getter: IGetter<T, R>;
  private readonly setter: ISetter<T, R>;
  public readonly from: string;
  public readonly to: string;

  public static buildLensPlay<T, R>(lens: Lens<T, R>, value: R): ILensPlayPayload<T> {
    const fn: ILensPlay<T> = (obj: T) => {
      return lens.set(obj, value);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    fn.toString = (): string => {
      return `${lens.toString()} = ${value}`;
    };
    return { fn, str: fn.toString() };
  }

  constructor(getter: IGetter<T, R>, setter: ISetter<T, R>, args: { from: string; to: string }) {
    this.getter = getter;
    this.setter = setter;
    this.from = args.from;
    this.to = args.to;
  }

  public modify(obj: T, f: (value: R) => R): T {
    return this.set(obj, f(this.view(obj)));
  }

  public set(obj: T, value: R): T {
    return this.setter(obj, value);
  }

  public then<V>(lens: Lens<R, V>): Lens<T, V> {
    return compose(this, lens);
  }

  public view(obj: T): R {
    return this.getter(obj);
  }

  public toString(): string {
    if (this.from != null && this.to != null) {
      return `${this.from} -> ${this.to}`;
    } else {
      return "Lens";
    }
  }
}

function compose<A, B, C>(a: Lens<A, B>, b: Lens<B, C>): Lens<A, C>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compose(...lenses: Lens<any, any>[]): Lens<any, any> {
  return lenses.reduce((accumulated, lens) => {
    return new Lens(
      obj => {
        const nextObj = accumulated.view(obj);
        return lens.view(nextObj);
      },
      (obj, value) => {
        const parent = accumulated.view(obj);
        const newParent = lens.set(parent, value);
        return accumulated.set(obj, newParent);
      },
      {
        from: accumulated.toString(),
        to: lens.to
      }
    );
  });
}
