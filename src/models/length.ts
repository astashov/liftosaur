import { ILength, ILengthUnit } from "../types";

const prebuiltLengths: Partial<Record<string, ILength>> = {};

export function Length_print(length: ILength): string {
  return `${length.value}${Length_printUnit(length.unit)}`;
}

export function Length_printUnit(lengthUnit: ILengthUnit): string {
  return lengthUnit === "in" ? '"' : lengthUnit;
}

export function Length_build(value: number, unit: ILengthUnit): ILength {
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

export function Length_is(object: unknown): object is ILength {
  const objLen = object as ILength;
  return (
    objLen &&
    typeof objLen === "object" &&
    "unit" in objLen &&
    "value" in objLen &&
    (objLen.unit === "cm" || objLen.unit === "in")
  );
}

export function Length_add(length: ILength, value: ILength): ILength {
  return Length_operation(length, value, (a, b) => a + b);
}

export function Length_subtract(length: ILength, value: ILength): ILength {
  return Length_operation(length, value, (a, b) => a - b);
}

export function Length_multiply(length: ILength, value: ILength): ILength {
  return Length_operation(length, value, (a, b) => a * b);
}

export function Length_divide(length: ILength, value: ILength): ILength {
  return Length_operation(length, value, (a, b) => a / b);
}

export function Length_gt(length: ILength, value: ILength): boolean {
  return comparison(length, value, (a, b) => a > b);
}

export function Length_lt(length: ILength, value: ILength): boolean {
  return comparison(length, value, (a, b) => a < b);
}

export function Length_gte(length: ILength, value: ILength): boolean {
  return comparison(length, value, (a, b) => a >= b);
}

export function Length_lte(length: ILength, value: ILength): boolean {
  return comparison(length, value, (a, b) => a <= b);
}

export function Length_eq(length: ILength, value: ILength): boolean {
  return comparison(length, value, (a, b) => a === b);
}

export function Length_eqeq(length: ILength, value: ILength): boolean {
  return length.value === value.value && length.unit === value.unit;
}

export function Length_convertTo(length: ILength, unit: ILengthUnit): ILength {
  if (length.unit === unit) {
    return length;
  } else if (length.unit === "in" && unit === "cm") {
    return Length_build(parseFloat((length.value * 2.54).toFixed(2)), unit);
  } else {
    return Length_build(parseFloat((length.value / 2.54).toFixed(2)), unit);
  }
}

export function Length_compare(a: ILength, b: ILength): number {
  return a.value - Length_convertTo(b, a.unit).value;
}

export function Length_compareReverse(a: ILength, b: ILength): number {
  return Length_convertTo(b, a.unit).value - a.value;
}

function comparison(length: ILength, value: ILength, op: (a: number, b: number) => boolean): boolean {
  return op(length.value, Length_convertTo(value, length.unit).value);
}

export function Length_operation(length: ILength, value: ILength, op: (a: number, b: number) => number): ILength {
  return Length_build(op(length.value, Length_convertTo(value, length.unit).value), length.unit);
}
