import { ILength, ILengthUnit } from "../types";

const prebuiltLengths: Partial<Record<string, ILength>> = {};

export namespace Length {
  export function print(length: ILength): string {
    return `${length.value}${Length.printUnit(length.unit)}`;
  }

  export function printUnit(lengthUnit: ILengthUnit): string {
    return lengthUnit === "in" ? '"' : lengthUnit;
  }

  export function build(value: number, unit: ILengthUnit): ILength {
    const key = `${value}_${unit}`;
    const prebuiltLength = prebuiltLengths[key];
    if (prebuiltLength != null) {
      return prebuiltLength;
    } else {
      const v = { value: typeof value === "string" ? parseFloat(value) : value, unit };
      prebuiltLengths[`${value}_${unit}`] = v;
      return v;
    }
  }

  export function is(object: unknown): object is ILength {
    const objLen = object as ILength;
    return (
      objLen &&
      typeof objLen === "object" &&
      "unit" in objLen &&
      "value" in objLen &&
      (objLen.unit === "cm" || objLen.unit === "in")
    );
  }

  export function add(length: ILength, value: ILength): ILength {
    return operation(length, value, (a, b) => a + b);
  }

  export function subtract(length: ILength, value: ILength): ILength {
    return operation(length, value, (a, b) => a - b);
  }

  export function multiply(length: ILength, value: ILength): ILength {
    return operation(length, value, (a, b) => a * b);
  }

  export function divide(length: ILength, value: ILength): ILength {
    return operation(length, value, (a, b) => a / b);
  }

  export function gt(length: ILength, value: ILength): boolean {
    return comparison(length, value, (a, b) => a > b);
  }

  export function lt(length: ILength, value: ILength): boolean {
    return comparison(length, value, (a, b) => a < b);
  }

  export function gte(length: ILength, value: ILength): boolean {
    return comparison(length, value, (a, b) => a >= b);
  }

  export function lte(length: ILength, value: ILength): boolean {
    return comparison(length, value, (a, b) => a <= b);
  }

  export function eq(length: ILength, value: ILength): boolean {
    return comparison(length, value, (a, b) => a === b);
  }

  export function eqeq(length: ILength, value: ILength): boolean {
    return length.value === value.value && length.unit === value.unit;
  }

  export function convertTo(length: ILength, unit: ILengthUnit): ILength {
    if (length.unit === unit) {
      return length;
    } else if (length.unit === "in" && unit === "cm") {
      return Length.build(parseFloat((length.value * 2.54).toFixed(2)), unit);
    } else {
      return Length.build(parseFloat((length.value / 2.54).toFixed(2)), unit);
    }
  }

  export function compare(a: ILength, b: ILength): number {
    return a.value - convertTo(b, a.unit).value;
  }

  export function compareReverse(a: ILength, b: ILength): number {
    return convertTo(b, a.unit).value - a.value;
  }

  function comparison(length: ILength, value: ILength, op: (a: number, b: number) => boolean): boolean {
    return op(length.value, convertTo(value, length.unit).value);
  }

  export function operation(length: ILength, value: ILength, op: (a: number, b: number) => number): ILength {
    return Length.build(op(length.value, convertTo(value, length.unit).value), length.unit);
  }
}
