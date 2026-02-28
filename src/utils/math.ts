export function MathUtils_round(value: number, to: number): number {
  return MathUtils_roundFloat(Math.round(value / to) * to, 4);
}

export function MathUtils_roundTo05(value: number): number {
  return MathUtils_round(value, 0.5);
}

export function MathUtils_roundTo005(value: number): number {
  return MathUtils_round(value, 0.05);
}

export function MathUtils_roundTo0005(value: number): number {
  return MathUtils_round(value, 0.005);
}

export function MathUtils_roundTo00005(value: number): number {
  return MathUtils_round(value, 0.0005);
}

export function MathUtils_roundTo000005(value: number): number {
  return MathUtils_round(value, 0.00005);
}

export function MathUtils_roundFloat(value: number, precision: number): number {
    if (typeof value !== "number" || isNaN(value)) {
      return 0;
    }
    return +value.toFixed(precision);
}

export function MathUtils_applyOp(a: number, b: number, opr: "+=" | "-=" | "*=" | "/=" | "="): number {
  if (opr === "=") {
    return b;
  } else if (opr === "+=") {
    return a + b;
  } else if (opr === "-=") {
    return a - b;
  } else if (opr === "*=") {
    return MathUtils_roundTo005(a * b);
  } else {
    return MathUtils_roundTo005(a / b);
  }
}

export function MathUtils_clamp(value: number, min?: number, max?: number): number {
  if (min != null && max != null) {
    return Math.max(min, Math.min(max, value));
  } else if (min != null) {
    return Math.max(min, value);
  } else if (max != null) {
    return Math.min(max, value);
  } else {
    return value;
  }
}

export function MathUtils_toWord(num?: number): string | undefined {
  if (num == null) {
    return undefined;
  }
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][
    num
  ];
}

export function MathUtils_parse(value?: string): number | undefined {
  if (value == null) {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

export function n(value: number, precision: number = 2): string {
  return `${MathUtils_roundFloat(value, precision)}`;
}
