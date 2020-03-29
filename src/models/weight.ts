export type IWeight = number;

export namespace Weight {
  export function display(weight: IWeight): string {
    return weight === 0 ? "BW" : `${weight}`;
  }

  export function round(weight: IWeight): IWeight {
    return Math.round(weight / 5) * 5;
  }
}
