export type IWeight = number;

export namespace Weight {
  export function display(weight: IWeight): string {
    return weight === 0 ? "Bodyweight" : `${weight}`;
  }
}
