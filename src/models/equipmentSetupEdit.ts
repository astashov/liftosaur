import {
  IEquipmentBand,
  IEquipmentData,
  IEquipmentHorn,
  IEquipmentSetup,
  IPlateCount,
  IStackSetup,
  IUnit,
  IWeight,
  IWeightRange,
} from "../types";
import { EquipmentSetup_save } from "./equipmentSetup";
import { Weight_convertTo } from "./weight";

type IEquipmentSetupType = IEquipmentSetup["type"];

export type IEquipmentBodyweightMode = "adds" | "assists";
export type IEquipmentBandColor = "yellow" | "red" | "blue" | "green" | "black" | "purple" | "orange" | "gray";
export const EquipmentSetupEdit_bandColors: IEquipmentBandColor[] = [
  "yellow",
  "red",
  "blue",
  "green",
  "black",
  "purple",
  "orange",
  "gray",
];
export type IEquipmentWeightList = "plates" | "addOn" | "builtin" | "values";

const DEFAULT_HORN_NAMES = ["Top", "Middle", "Low"];
const MAX_HORNS = 3;
const NEW_PLATE_COUNT = 2;
const DEFAULT_WARMUP_PLATE_SIZES = 2;
const EXAMPLE_LOAD_LB = 45;
const EXAMPLE_LOAD_KG = 20;
const NEW_BAND_STEP_LB = 10;
const NEW_BAND_STEP_KG = 5;

export const EquipmentSetupEdit_types: { type: IEquipmentSetupType; label: string; description: string }[] = [
  { type: "stack", label: "Weight stack", description: "Cable columns and stack machines" },
  { type: "plates", label: "Plates", description: "Barbells, plate-loaded machines, dip belts" },
  { type: "fixed", label: "Fixed weights", description: "Dumbbells, kettlebells, fixed barbells" },
  { type: "electric", label: "Electric", description: "Voltra, Tonal" },
  { type: "bands", label: "Bands", description: "Resistance bands, band-assisted pull-ups" },
];

export function EquipmentSetupEdit_typeName(type: IEquipmentSetupType): string {
  return EquipmentSetupEdit_types.find((t) => t.type === type)?.label ?? type;
}

export function EquipmentSetupEdit_typeDescription(type: IEquipmentSetupType): string | undefined {
  return EquipmentSetupEdit_types.find((t) => t.type === type)?.description;
}

export function EquipmentSetupEdit_parseType(value: string | undefined): IEquipmentSetupType | undefined {
  return EquipmentSetupEdit_types.find((t) => t.type === value)?.type;
}

function defaultPlates(unit: IUnit): IPlateCount[] {
  return unit === "lb"
    ? [
        { weight: 45, num: 8 },
        { weight: 25, num: 4 },
        { weight: 10, num: 4 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
      ]
    : [
        { weight: 20, num: 8 },
        { weight: 10, num: 4 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
        { weight: 1.25, num: 4 },
      ];
}

function defaultBands(unit: IUnit): IEquipmentBand[] {
  const weights = unit === "lb" ? [10, 25, 40, 60, 80] : [5, 10, 20, 30, 40];
  const colors: IEquipmentBandColor[] = ["yellow", "red", "blue", "green", "black"];
  return colors.map((color, i) => ({
    name: EquipmentSetupEdit_bandColorName(color),
    color,
    weight: weights[i],
    num: 1,
  }));
}

export function EquipmentSetupEdit_bandColorName(color: IEquipmentBandColor): string {
  return color[0].toUpperCase() + color.slice(1);
}

export function EquipmentSetupEdit_bandColor(band: { color?: string }): IEquipmentBandColor {
  return EquipmentSetupEdit_bandColors.find((c) => c === band.color) ?? "gray";
}

export function EquipmentSetupEdit_addBand(bands: IEquipmentBand[], unit: IUnit): IEquipmentBand[] {
  const names = bands.map((b) => b.name);
  let index = bands.length + 1;
  while (names.indexOf(`Band ${index}`) !== -1) {
    index += 1;
  }
  const usedColors = bands.map((b) => b.color);
  const color = EquipmentSetupEdit_bandColors.find((c) => usedColors.indexOf(c) === -1) ?? "gray";
  const heaviest = bands.reduce((memo, b) => Math.max(memo, b.weight), 0);
  const weight = heaviest + (unit === "lb" ? NEW_BAND_STEP_LB : NEW_BAND_STEP_KG);
  return [...bands, { name: `Band ${index}`, color, weight, num: 1 }];
}

export function EquipmentSetupEdit_updateBand(
  bands: IEquipmentBand[],
  index: number,
  patch: Partial<IEquipmentBand>
): IEquipmentBand[] {
  const name = patch.name?.trim();
  const isValid =
    (patch.name == null || !!name) &&
    (patch.weight == null || patch.weight > 0) &&
    (patch.num == null || (patch.num >= 1 && Number.isInteger(patch.num)));
  if (!isValid || bands[index] == null) {
    return bands;
  }
  return bands.map((band, i) => (i === index ? { ...band, ...patch, ...(name != null ? { name } : {}) } : band));
}

export function EquipmentSetupEdit_removeBand(bands: IEquipmentBand[], index: number): IEquipmentBand[] {
  return bands.filter((_, i) => i !== index);
}

export function EquipmentSetupEdit_default(type: IEquipmentSetupType, unit: IUnit): IEquipmentSetup {
  const isLb = unit === "lb";
  switch (type) {
    case "stack":
      return { type, unit, ranges: [isLb ? { from: 10, to: 200, step: 10 } : { from: 5, to: 100, step: 5 }] };
    case "plates":
      return { type, unit, base: isLb ? 45 : 20, plates: defaultPlates(unit), sides: 2 };
    case "fixed":
      return {
        type,
        unit,
        ranges: [isLb ? { from: 5, to: 50, step: 5 } : { from: 2.5, to: 25, step: 2.5 }],
        values: [],
      };
    case "electric":
      return isLb ? { type, unit, min: 5, max: 200, step: 1 } : { type, unit, min: 2, max: 90, step: 0.5 };
    case "bands":
      return { type, unit, bands: defaultBands(unit), combine: false };
  }
}

export function EquipmentSetupEdit_changeType(setup: IEquipmentSetup, type: IEquipmentSetupType): IEquipmentSetup {
  if (setup.type === type) {
    return setup;
  }
  return {
    ...EquipmentSetupEdit_default(type, setup.unit),
    ...(setup.rounding != null ? { rounding: setup.rounding } : {}),
    ...(setup.direction != null ? { direction: setup.direction } : {}),
    ...(setup.bodyweight != null ? { bodyweight: setup.bodyweight } : {}),
  };
}

function pinUnit(data: IEquipmentData, setup: IEquipmentSetup, appUnit: IUnit): IEquipmentData {
  const { unit: _unit, ...rest } = data;
  return setup.unit === appUnit ? rest : { ...rest, unit: setup.unit };
}

export function EquipmentSetupEdit_newEquipment(setup: IEquipmentSetup, name: string, appUnit: IUnit): IEquipmentData {
  const empty: IEquipmentData = {
    vtype: "equipment_data",
    name,
    multiplier: 1,
    bar: { lb: { value: 0, unit: "lb" }, kg: { value: 0, unit: "kg" } },
    plates: [],
    fixed: [],
    isFixed: false,
  };
  return EquipmentSetupEdit_apply(empty, setup, appUnit);
}

export function EquipmentSetupEdit_apply(data: IEquipmentData, setup: IEquipmentSetup, appUnit: IUnit): IEquipmentData {
  return EquipmentSetup_save(pinUnit(data, setup, appUnit), setup);
}

export function EquipmentSetupEdit_setRounding(setup: IEquipmentSetup, rounding: string | undefined): IEquipmentSetup {
  const { rounding: _rounding, ...rest } = setup;
  return rounding === "down" || rounding === "nearest" ? { ...rest, rounding } : rest;
}

export function EquipmentSetupEdit_addWeight(
  setup: IEquipmentSetup,
  list: IEquipmentWeightList,
  weight: number
): IEquipmentSetup {
  if (list === "plates" && setup.type === "plates") {
    return { ...setup, plates: EquipmentSetupEdit_addPlates(setup.plates, weight) };
  }
  if (list === "addOn" && (setup.type === "stack" || setup.type === "fixed")) {
    return { ...setup, addOn: EquipmentSetupEdit_addPlates(setup.addOn ?? [], weight) };
  }
  if (list === "builtin" && setup.type === "stack") {
    return { ...setup, builtin: EquipmentSetupEdit_addValue(setup.builtin ?? [], weight) };
  }
  if (list === "values" && setup.type === "fixed") {
    return { ...setup, values: EquipmentSetupEdit_addValue(setup.values, weight) };
  }
  return setup;
}

export function EquipmentSetupEdit_unitChoice(choice: number | undefined): "convert" | "relabel" | undefined {
  return choice === 0 ? "convert" : choice === 1 ? "relabel" : undefined;
}

export function EquipmentSetupEdit_bodyweightMode(setup: IEquipmentSetup): IEquipmentBodyweightMode | undefined {
  if (setup.direction === "assists") {
    return "assists";
  }
  return setup.bodyweight != null ? "adds" : undefined;
}

export function EquipmentSetupEdit_bodyweightModesToAdd(
  setup: IEquipmentSetup,
  supported: IEquipmentBodyweightMode[]
): IEquipmentBodyweightMode[] {
  return EquipmentSetupEdit_bodyweightMode(setup) != null ? [] : supported;
}

export function EquipmentSetupEdit_pinNumbersExample(setup: IStackSetup): string {
  const pins: number[] = [];
  for (const range of setup.ranges) {
    for (let w = range.from; range.step > 0 && w <= range.to + 1e-6 && pins.length < 3; w += range.step) {
      const pin = Math.round(w * 1e6) / 1e6;
      if (pins.indexOf(pin) === -1) {
        pins.push(pin);
      }
    }
  }
  const examples = pins.map((pin, i) => `#${i + 1} is ${pin} ${setup.unit}`).join(", ");
  return examples !== "" ? `Counted from the lightest plate: ${examples}.` : "Counted from the lightest plate.";
}

export function EquipmentSetupEdit_bodyweightPercent(setup: IEquipmentSetup): number {
  return Math.round((setup.bodyweight?.share ?? 1) * 100);
}

function roundForHelp(value: number): number {
  return Math.round(value * 10) / 10;
}

export function EquipmentSetupEdit_bodyweightHelp(
  setup: IEquipmentSetup,
  bodyweight: IWeight,
  isBodyweightLogged: boolean
): string {
  const unit = setup.unit;
  const example = unit === "lb" ? EXAMPLE_LOAD_LB : EXAMPLE_LOAD_KG;
  const isAssisting = setup.direction === "assists";
  if (setup.bodyweight == null) {
    return isAssisting ? `-${example} ${unit} in a program means ${example} ${unit} of assistance.` : "";
  }
  const total = roundForHelp(Weight_convertTo(bodyweight, unit).value);
  const counted = roundForHelp(total * (setup.bodyweight.share ?? 1));
  const intro = isBodyweightLogged
    ? `Your bodyweight is ${total} ${unit}.`
    : `No bodyweight logged, so it uses ${total} ${unit}.`;
  const share = counted !== total ? ` ${EquipmentSetupEdit_bodyweightPercent(setup)}% of it counts.` : "";
  const programWeight = roundForHelp(isAssisting ? counted - example : counted + example);
  const meaning = isAssisting ? `${example} ${unit} of assistance` : `${example} ${unit} added`;
  return `${intro}${share} ${programWeight} ${unit} in a program means ${meaning}.`;
}

export function EquipmentSetupEdit_addValue(values: number[], value: number | undefined): number[] {
  if (value == null || !(value > 0) || values.indexOf(value) !== -1) {
    return values;
  }
  return [...values, value].sort((a, b) => a - b);
}

export function EquipmentSetupEdit_removeValue(values: number[], value: number): number[] {
  return values.filter((v) => v !== value);
}

export function EquipmentSetupEdit_addRange(ranges: IWeightRange[]): IWeightRange[] {
  const last = ranges[ranges.length - 1];
  if (last == null) {
    return [{ from: 5, to: 50, step: 5 }];
  }
  return [...ranges, { from: last.to, to: last.to + last.step * 5, step: last.step }];
}

export function EquipmentSetupEdit_updateRange(
  ranges: IWeightRange[],
  index: number,
  change: Partial<IWeightRange>
): IWeightRange[] {
  const current = ranges[index];
  if (current == null) {
    return ranges;
  }
  const merged = { ...current, ...change };
  const isFromPastTo = change.from != null && change.to == null && merged.from > merged.to;
  const updated = isFromPastTo ? { ...merged, to: merged.from + (current.to - current.from) } : merged;
  return ranges.map((range, i) => {
    if (i === index) {
      return updated;
    }
    if (i === index + 1 && updated.to !== current.to && range.from === current.to) {
      return { ...range, from: updated.to };
    }
    if (i === index - 1 && updated.from !== current.from && range.to === current.from) {
      return { ...range, to: updated.from };
    }
    return range;
  });
}

export function EquipmentSetupEdit_removeRange(ranges: IWeightRange[], index: number): IWeightRange[] {
  const previous = ranges[index - 1];
  const current = ranges[index];
  const next = ranges[index + 1];
  const isBridged = previous != null && current != null && next != null && previous.to === current.from;
  return ranges
    .map((range, i) =>
      isBridged && i === index + 1 && range.from === current.to ? { ...range, from: previous.to } : range
    )
    .filter((_, i) => i !== index);
}

export function EquipmentSetupEdit_setPlateCount(plates: IPlateCount[], weight: number, num: number): IPlateCount[] {
  const others = plates.filter((p) => p.weight !== weight);
  const next = num > 0 ? [...others, { weight, num: Math.floor(num) }] : others;
  return next.sort((a, b) => b.weight - a.weight);
}

export function EquipmentSetupEdit_addPlates(plates: IPlateCount[], weight: number | undefined): IPlateCount[] {
  if (weight == null || !(weight > 0)) {
    return plates;
  }
  const existing = plates.find((p) => p.weight === weight)?.num ?? 0;
  return EquipmentSetupEdit_setPlateCount(plates, weight, existing + NEW_PLATE_COUNT);
}

export function EquipmentSetupEdit_defaultWarmupPlates(plates: IPlateCount[]): number[] {
  return [...plates]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, DEFAULT_WARMUP_PLATE_SIZES)
    .map((p) => p.weight);
}

export function EquipmentSetupEdit_hornPercents(horns: IEquipmentHorn[]): number[] {
  const sum = horns.reduce((memo, h) => memo + Math.max(0, h.ratio), 0);
  return horns.map((h) => (sum > 0 ? Math.round((Math.max(0, h.ratio) / sum) * 100) : 0));
}

export function EquipmentSetupEdit_canAddHorn(horns: IEquipmentHorn[]): boolean {
  return horns.length < MAX_HORNS;
}

function newHorn(horns: IEquipmentHorn[]): IEquipmentHorn {
  const taken = horns.map((h) => h.name);
  const name = DEFAULT_HORN_NAMES.find((n) => taken.indexOf(n) === -1) ?? `Horn ${horns.length + 1}`;
  return { name, ratio: 1 };
}

export function EquipmentSetupEdit_addHorn(horns: IEquipmentHorn[]): IEquipmentHorn[] {
  const withFirst = horns.length === 0 ? [newHorn(horns)] : horns;
  return [...withFirst, newHorn(withFirst)];
}

export function EquipmentSetupEdit_setHornRatio(
  horns: IEquipmentHorn[],
  index: number,
  ratio: number
): IEquipmentHorn[] {
  return horns.map((horn, i) => (i === index ? { ...horn, ratio } : horn));
}

export function EquipmentSetupEdit_setHornName(horns: IEquipmentHorn[], index: number, name: string): IEquipmentHorn[] {
  const trimmed = name.trim();
  const isTaken = horns.some((horn, i) => i !== index && horn.name.toLowerCase() === trimmed.toLowerCase());
  if (trimmed === "" || isTaken || horns[index] == null) {
    return horns;
  }
  return horns.map((horn, i) => (i === index ? { ...horn, name: trimmed } : horn));
}

export function EquipmentSetupEdit_removeHorn(horns: IEquipmentHorn[], index: number): IEquipmentHorn[] | undefined {
  const rest = horns.filter((_, i) => i !== index);
  return rest.length > 1 ? rest : undefined;
}

export function EquipmentSetupEdit_toggleWarmupPlate(warmupPlates: number[], weight: number): number[] {
  return warmupPlates.indexOf(weight) !== -1 ? warmupPlates.filter((w) => w !== weight) : [...warmupPlates, weight];
}

export function EquipmentSetupEdit_setBodyweightShare(setup: IEquipmentSetup, percent: number): IEquipmentSetup {
  if (setup.bodyweight == null || !(percent > 0 && percent <= 100)) {
    return setup;
  }
  return { ...setup, bodyweight: percent === 100 ? {} : { share: percent / 100 } };
}

export function EquipmentSetupEdit_setBodyweight(
  setup: IEquipmentSetup,
  mode: "none" | "adds" | "assists",
  logAsTotal: boolean
): IEquipmentSetup {
  const { direction: _direction, bodyweight, ...rest } = setup;
  const share = bodyweight?.share;
  const withBodyweight = logAsTotal ? { bodyweight: share != null ? { share } : {} } : {};
  if (mode === "none") {
    return rest;
  }
  if (mode === "adds") {
    return { ...rest, ...withBodyweight };
  }
  return { ...rest, direction: "assists", ...withBodyweight };
}
