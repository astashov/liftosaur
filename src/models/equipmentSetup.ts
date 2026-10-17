import {
  IEquipmentData,
  IEquipmentSetup,
  IPlate,
  IPlateCount,
  IStackSetup,
  IUnit,
  IWeight,
  IWeightRange,
} from "../types";
import { StringUtils_hashString } from "../utils/string";
import { EquipmentLoadSolver_reachable } from "./equipmentLoadSolver";
import { Weight_smartConvert } from "./weight";

type ILegacyFields = Pick<
  IEquipmentData,
  "bar" | "multiplier" | "plates" | "fixed" | "isFixed" | "useBodyweightForBar" | "isAssisting" | "unit"
>;

const LEGACY_HASH_VERSION = "v1";
const MAX_LEGACY_FIXED = 200;
const MAX_LEGACY_BAND_TOTALS = 50;

const PLATE_EQUIVALENTS: [number, number][] = [
  [55, 25],
  [45, 20],
  [35, 15],
  [25, 10],
  [10, 5],
  [5, 2.5],
  [2.5, 1.25],
  [1.25, 0.5],
];

function convertWeight(value: number, from: IUnit, to: IUnit): number {
  if (from === to) {
    return value;
  }
  const pair = PLATE_EQUIVALENTS.find(([lb, kg]) => (from === "lb" ? lb : kg) === value);
  if (pair != null) {
    return to === "lb" ? pair[0] : pair[1];
  }
  return Weight_smartConvert({ value, unit: from }, to).value;
}

function weightsIn(weights: IWeight[], unit: IUnit): number[] {
  return weights.filter((w) => w.unit === unit).map((w) => w.value);
}

export function EquipmentSetup_fromLegacy(data: IEquipmentData, unit: IUnit): IEquipmentSetup {
  if (data.isFixed) {
    const fixedUnit = data.unit ?? unit;
    return { type: "fixed", unit: fixedUnit, ranges: [], values: weightsIn(data.fixed, fixedUnit) };
  }
  const usesBodyweight = !!data.useBodyweightForBar;
  return {
    type: "plates",
    unit,
    base: usesBodyweight ? 0 : data.bar[unit].value,
    plates: data.plates.filter((p) => p.weight.unit === unit).map((p) => ({ weight: p.weight.value, num: p.num })),
    sides: data.multiplier || 1,
    ...(data.isAssisting ? { direction: "assists" as const } : {}),
    ...(usesBodyweight ? { bodyweight: {} } : {}),
  };
}

function legacyBar(value: number, unit: IUnit): IEquipmentData["bar"] {
  const other: IUnit = unit === "lb" ? "kg" : "lb";
  const otherValue = convertWeight(value, unit, other);
  return unit === "lb"
    ? { lb: { value, unit: "lb" }, kg: { value: otherValue, unit: "kg" } }
    : { lb: { value: otherValue, unit: "lb" }, kg: { value, unit: "kg" } };
}

function legacyPlates(plates: IPlateCount[], unit: IUnit): IPlate[] {
  return plates.map((p) => ({ weight: { value: p.weight, unit }, num: p.num }));
}

function rangeValues(ranges: IWeightRange[], limit: number): number[] {
  const values: number[] = [];
  for (const range of ranges) {
    for (
      let value = range.from;
      value <= range.to + 1e-6 && values.length < limit && range.step > 0;
      value += range.step
    ) {
      values.push(Math.round(value * 1e6) / 1e6);
    }
  }
  return values;
}

function isAssistanceOnly(setup: IEquipmentSetup, base: number): boolean {
  return setup.direction === "assists" && setup.bodyweight == null && base === 0;
}

function legacyAssisting(setup: IEquipmentSetup, base: number): boolean {
  return setup.direction === "assists" && !isAssistanceOnly(setup, base);
}

function legacyStepPlates(setup: IEquipmentSetup, bar: number, step: number, count: number): ILegacyFields {
  return {
    bar: legacyBar(bar, setup.unit),
    multiplier: 1,
    plates: count > 0 && step > 0 ? legacyPlates([{ weight: step, num: count }], setup.unit) : [],
    fixed: [],
    isFixed: false,
    useBodyweightForBar: setup.bodyweight != null,
    isAssisting: legacyAssisting(setup, bar),
    unit: setup.unit,
  };
}

function legacyFixed(setup: IEquipmentSetup, values: number[]): ILegacyFields {
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  return {
    bar: legacyBar(0, setup.unit),
    multiplier: 1,
    plates: [],
    fixed: unique.map((value) => ({ value, unit: setup.unit })),
    isFixed: true,
    useBodyweightForBar: setup.bodyweight != null,
    isAssisting: legacyAssisting(setup, 0),
    unit: setup.unit,
  };
}

function stackToLegacy(setup: IStackSetup): ILegacyFields {
  const ratio = setup.pullRatio ?? 1;
  const first = setup.ranges[0];
  if (first == null) {
    return legacyFixed(setup, []);
  }
  if (setup.direction === "assists") {
    const start = setup.bodyweight != null ? 0 : (setup.base ?? 0) * ratio;
    return legacyStepPlates(setup, start, first.step * ratio, Math.floor(first.to / first.step + 1e-6));
  }
  const count = Math.floor((first.to - first.from) / first.step + 1e-6);
  return legacyStepPlates(setup, ((setup.base ?? 0) + first.from) * ratio, first.step * ratio, count);
}

export function EquipmentSetup_toLegacy(setup: IEquipmentSetup): ILegacyFields {
  switch (setup.type) {
    case "plates":
      return {
        bar: legacyBar(setup.base, setup.unit),
        multiplier: setup.sides,
        plates: legacyPlates(setup.plates, setup.unit),
        fixed: [],
        isFixed: false,
        useBodyweightForBar: setup.bodyweight != null,
        isAssisting: legacyAssisting(setup, setup.base),
        unit: setup.unit,
      };
    case "stack":
      return stackToLegacy(setup);
    case "electric":
      return legacyStepPlates(setup, setup.min, setup.step, Math.floor((setup.max - setup.min) / setup.step + 1e-6));
    case "fixed":
      return legacyFixed(setup, [...rangeValues(setup.ranges, MAX_LEGACY_FIXED), ...setup.values]);
    case "bands":
      return legacyFixed(setup, EquipmentLoadSolver_reachable(setup, {}, MAX_LEGACY_BAND_TOTALS).values);
  }
}

export function EquipmentSetup_legacyHash(data: IEquipmentData): string {
  const canonical = JSON.stringify([
    data.bar,
    data.plates,
    data.fixed,
    data.isFixed,
    data.multiplier,
    !!data.useBodyweightForBar,
    !!data.isAssisting,
    data.unit ?? null,
  ]);
  return `${LEGACY_HASH_VERSION}:${StringUtils_hashString(canonical)}`;
}

export function EquipmentSetup_save(data: IEquipmentData, setup: IEquipmentSetup): IEquipmentData {
  const saved: IEquipmentData = { ...data, ...EquipmentSetup_toLegacy(setup), setup };
  return { ...saved, setupLegacyHash: EquipmentSetup_legacyHash(saved) };
}

function convertRanges(ranges: IWeightRange[], from: IUnit, to: IUnit): IWeightRange[] {
  const result: IWeightRange[] = [];
  ranges.forEach((range, index) => {
    const previous = result[index - 1];
    const isConnected = index > 0 && ranges[index - 1].to === range.from;
    const start = isConnected && previous != null ? previous.to : convertWeight(range.from, from, to);
    const step = convertWeight(range.step, from, to);
    const end = convertWeight(range.to, from, to);
    const count = step > 0 ? Math.max(0, Math.floor((end - start) / step + 1e-6)) : 0;
    result.push({ from: start, to: Math.round((start + count * step) * 1e6) / 1e6, step });
  });
  return result;
}

function convertPlates(plates: IPlateCount[], from: IUnit, to: IUnit): IPlateCount[] {
  const merged = new Map<number, number>();
  for (const plate of plates) {
    const weight = convertWeight(plate.weight, from, to);
    merged.set(weight, (merged.get(weight) ?? 0) + plate.num);
  }
  return Array.from(merged.entries()).map(([weight, num]) => ({ weight, num }));
}

function convertValues(values: number[], from: IUnit, to: IUnit): number[] {
  return Array.from(new Set(values.map((v) => convertWeight(v, from, to))));
}

export function EquipmentSetup_convertUnit(
  setup: IEquipmentSetup,
  unit: IUnit,
  mode: "convert" | "relabel"
): IEquipmentSetup {
  if (mode === "relabel" || setup.unit === unit) {
    return { ...setup, unit };
  }
  const from = setup.unit;
  switch (setup.type) {
    case "stack":
      return {
        ...setup,
        unit,
        ...(setup.base != null ? { base: convertWeight(setup.base, from, unit) } : {}),
        ranges: convertRanges(setup.ranges, from, unit),
        ...(setup.builtin != null ? { builtin: convertValues(setup.builtin, from, unit) } : {}),
        ...(setup.addOn != null ? { addOn: convertPlates(setup.addOn, from, unit) } : {}),
      };
    case "plates":
      return {
        ...setup,
        unit,
        base: convertWeight(setup.base, from, unit),
        plates: convertPlates(setup.plates, from, unit),
        ...(setup.warmupPlates != null ? { warmupPlates: convertValues(setup.warmupPlates, from, unit) } : {}),
      };
    case "fixed":
      return {
        ...setup,
        unit,
        ranges: convertRanges(setup.ranges, from, unit),
        values: convertValues(setup.values, from, unit),
        ...(setup.addOn != null ? { addOn: convertPlates(setup.addOn, from, unit) } : {}),
      };
    case "electric": {
      const [range] = convertRanges([{ from: setup.min, to: setup.max, step: setup.step }], from, unit);
      return { ...setup, unit, min: range.from, max: range.to, step: range.step };
    }
    case "bands":
      return { ...setup, unit, bands: setup.bands.map((b) => ({ ...b, weight: convertWeight(b.weight, from, unit) })) };
  }
}

function rangesText(ranges: IWeightRange[]): string {
  if (ranges.length === 0) {
    return "";
  }
  if (ranges.length === 1) {
    return `${ranges[0].from}–${ranges[0].to} by ${ranges[0].step}`;
  }
  return `${ranges[0].from}–${ranges[ranges.length - 1].to} · uneven steps`;
}

function ratioText(ratio: number | undefined): string | undefined {
  if (ratio == null || ratio === 1) {
    return undefined;
  }
  return ratio === 0.5 ? "half" : ratio === 0.25 ? "quarter" : `×${ratio}`;
}

function bodyweightText(setup: IEquipmentSetup): string | undefined {
  if (setup.direction === "assists") {
    return setup.bodyweight != null ? "bodyweight − assist" : "assists";
  }
  return setup.bodyweight != null ? "+ bodyweight" : undefined;
}

const MAX_COMBINATIONS = 2000;

function isNumber(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function rangeErrors(ranges: IWeightRange[]): string[] {
  const errors: string[] = [];
  for (const range of ranges) {
    if (!isNumber(range.from) || !isNumber(range.to) || !isNumber(range.step)) {
      errors.push("Every range needs a start, an end and a step.");
    } else if (range.step <= 0) {
      errors.push("A step must be above 0.");
    } else if (range.from > range.to) {
      errors.push(`A range can't start above its end (${range.from} → ${range.to}).`);
    } else if (range.from < 0) {
      errors.push("Weights can't be negative.");
    }
  }
  return errors;
}

function countErrors(items: { weight: number; num: number }[], what: string): string[] {
  const errors: string[] = [];
  for (const item of items) {
    if (!isNumber(item.weight) || item.weight <= 0) {
      errors.push(`Every ${what} needs a weight above 0.`);
    } else if (!Number.isInteger(item.num) || item.num < 0) {
      errors.push(`${what[0].toUpperCase()}${what.slice(1)} counts must be whole numbers.`);
    }
  }
  return errors;
}

function combinationCount(items: { num: number }[]): number {
  return items.reduce((memo, item) => memo * (Math.max(0, item.num) + 1), 1);
}

function combinationErrors(items: { num: number }[], what: string): string[] {
  return combinationCount(items) > MAX_COMBINATIONS
    ? [`Too many ${what} to combine. Remove some sizes or lower their counts.`]
    : [];
}

function typeErrors(setup: IEquipmentSetup): string[] {
  switch (setup.type) {
    case "stack": {
      const pullRatio = setup.pullRatio ?? 1;
      return [
        ...(setup.ranges.length === 0 ? ["Add at least one range to the stack."] : []),
        ...rangeErrors(setup.ranges),
        ...(!isNumber(pullRatio) || pullRatio <= 0 ? ["The pull ratio must be above 0."] : []),
        ...((setup.builtin ?? []).some((b) => !isNumber(b) || b <= 0) ? ["Built-in weights must be above 0."] : []),
        ...countErrors(setup.addOn ?? [], "added plate"),
        ...combinationErrors(setup.addOn ?? [], "added plates"),
      ];
    }
    case "plates": {
      const horns = setup.horns ?? [];
      return [
        ...(!isNumber(setup.base) || setup.base < 0 ? ["The base weight can't be negative."] : []),
        ...(!Number.isInteger(setup.sides) || setup.sides < 1 ? ["Sides must be a whole number, 1 or more."] : []),
        ...countErrors(setup.plates, "plate"),
        ...(horns.some((h) => !isNumber(h.ratio) || h.ratio < 0) ? ["Horn ratios can't be negative."] : []),
        ...(horns.length > 0 && !horns.some((h) => h.ratio > 0) ? ["At least one horn needs a ratio above 0."] : []),
      ];
    }
    case "fixed":
      return [
        ...(setup.ranges.length === 0 && setup.values.length === 0 ? ["Add at least one weight."] : []),
        ...rangeErrors(setup.ranges),
        ...(setup.values.some((v) => !isNumber(v) || v <= 0) ? ["Single weights must be above 0."] : []),
        ...countErrors(setup.addOn ?? [], "added plate"),
        ...combinationErrors(setup.addOn ?? [], "added plates"),
      ];
    case "electric":
      return rangeErrors([{ from: setup.min, to: setup.max, step: setup.step }]);
    case "bands":
      return [
        ...(setup.bands.length === 0 ? ["Add at least one band."] : []),
        ...setup.bands
          .filter((b, i) => setup.bands.findIndex((other) => other.name === b.name) !== i)
          .map((b) => `Two bands are named ${b.name}.`),
        ...countErrors(setup.bands, "band"),
        ...(setup.combine ? combinationErrors(setup.bands, "bands") : []),
      ];
  }
}

export function EquipmentSetup_validate(setup: IEquipmentSetup): string[] {
  const share = setup.bodyweight?.share;
  const errors = [
    ...typeErrors(setup),
    ...(share != null && (!isNumber(share) || share <= 0 || share > 1)
      ? ["The share of bodyweight must be above 0% and at most 100%."]
      : []),
  ];
  return Array.from(new Set(errors));
}

export function EquipmentSetup_summary(setup: IEquipmentSetup): string {
  const parts: (string | undefined)[] = [];
  switch (setup.type) {
    case "stack": {
      const addOns = [...(setup.builtin ?? []), ...(setup.addOn ?? []).map((p) => p.weight)];
      parts.push("Weight stack", rangesText(setup.ranges), ratioText(setup.pullRatio));
      parts.push(addOns.length > 0 ? `+${addOns.join("/")}` : undefined);
      break;
    }
    case "plates": {
      const loadedHorns = (setup.horns ?? []).filter((h) => h.ratio > 0);
      parts.push("Plates", setup.base > 0 ? `${setup.base} ${setup.unit} base` : undefined);
      parts.push(setup.horns != null && setup.horns.length > 1 ? `${setup.horns.length} horns` : undefined);
      parts.push(loadedHorns.length > 1 ? loadedHorns.map((h) => h.ratio).join(":") : undefined);
      parts.push(setup.sides === 1 ? "one side" : undefined);
      parts.push(setup.warmupPlates != null ? `warmups ${setup.warmupPlates.join("/")}` : undefined);
      break;
    }
    case "fixed":
      parts.push("Fixed weights", rangesText(setup.ranges));
      parts.push(
        setup.values.length > 0 ? `${setup.ranges.length > 0 ? "+" : ""}${setup.values.join(", ")}` : undefined
      );
      break;
    case "electric":
      parts.push("Electric", `${setup.min}–${setup.max} by ${setup.step}`);
      break;
    case "bands":
      parts.push("Bands", setup.bands.map((b) => b.name).join(", "));
      break;
  }
  parts.push(bodyweightText(setup));
  return parts.filter((p): p is string => p != null && p !== "").join(" · ");
}
