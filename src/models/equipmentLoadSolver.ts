import { IBandsSetup, IEquipmentHorn, IEquipmentSetup, IPlateCount, IUnit, IWeight, IWeightRange } from "../types";
import { MathUtils_roundTo000005 } from "../utils/math";

export interface IEquipmentLoadQuery {
  bodyweight?: IWeight;
  warmup?: { firstWorkingWeight?: IWeight };
}

export type IEquipmentLoadInstruction =
  | { type: "stack"; pin: number; builtin?: number; addOn: IPlateCount[] }
  | { type: "plates"; sides: number; horns: { name?: string; plates: IPlateCount[] }[] }
  | { type: "fixed"; value: number; addOn: IPlateCount[] }
  | { type: "electric"; value: number }
  | { type: "bands"; bands: { name: string; num: number }[] };

export interface IEquipmentLoad {
  total: IWeight;
  exact: boolean;
  unit: IUnit;
  instruction?: IEquipmentLoadInstruction;
}

interface ILoadOption {
  load: number;
  build: () => IEquipmentLoadInstruction;
}

interface ILoadPicker {
  floor(x: number): ILoadOption | undefined;
  ceil(x: number): ILoadOption | undefined;
  min(): ILoadOption | undefined;
}

interface IEffectiveScale {
  start: number;
  ratio: number;
  sign: 1 | -1;
  maxLoad: number;
}

const LB_PER_KG = 2.205;
const EPSILON = 1e-6;
const STEP_OFFSET = 0.001;
// The old solver rounded a converted target to 0.5 before picking, so a 35 lb target took a 16 kg (35.3 lb) bell
const CONVERSION_TOLERANCE = 0.25;
const MAX_STEPS = 10000;
const MAX_COMBINATIONS = 2000;
const MAX_SPLIT_STEPS = 200;

function clean(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function convertExact(value: number, from: IUnit, to: IUnit): number {
  if (from === to) {
    return value;
  }
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

function convertForCaller(value: number, from: IUnit, to: IUnit): number {
  if (from === to) {
    return MathUtils_roundTo000005(value) + 0;
  }
  const converted = from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
  return Math.round(converted / 0.5) * 0.5 + 0;
}

function mergePlates(plates: IPlateCount[]): IPlateCount[] {
  const merged = new Map<number, number>();
  for (const plate of plates) {
    if (plate.num > 0 && plate.weight > 0) {
      merged.set(plate.weight, (merged.get(plate.weight) ?? 0) + plate.num);
    }
  }
  return Array.from(merged.entries())
    .map(([weight, num]) => ({ weight, num }))
    .sort((a, b) => b.weight - a.weight);
}

function rangeFloor(range: IWeightRange, x: number): number | undefined {
  if (range.step <= 0 || x < range.from - EPSILON) {
    return undefined;
  }
  const n = Math.floor((Math.min(x, range.to) - range.from) / range.step + EPSILON);
  return clean(range.from + n * range.step);
}

function rangeCeil(range: IWeightRange, x: number): number | undefined {
  if (range.step <= 0) {
    return undefined;
  }
  const last = range.from + Math.floor((range.to - range.from) / range.step + EPSILON) * range.step;
  if (x > last + EPSILON) {
    return undefined;
  }
  if (x <= range.from) {
    return clean(range.from);
  }
  const n = Math.ceil((x - range.from) / range.step - EPSILON);
  return clean(range.from + n * range.step);
}

function valuesFloor(ranges: IWeightRange[], values: number[], x: number): number | undefined {
  let best: number | undefined;
  for (const range of ranges) {
    const candidate = rangeFloor(range, x);
    if (candidate != null && (best == null || candidate > best)) {
      best = candidate;
    }
  }
  for (const value of values) {
    if (value <= x + EPSILON && (best == null || value > best)) {
      best = value;
    }
  }
  return best;
}

function valuesCeil(ranges: IWeightRange[], values: number[], x: number): number | undefined {
  let best: number | undefined;
  for (const range of ranges) {
    const candidate = rangeCeil(range, x);
    if (candidate != null && (best == null || candidate < best)) {
      best = candidate;
    }
  }
  for (const value of values) {
    if (value >= x - EPSILON && (best == null || value < best)) {
      best = value;
    }
  }
  return best;
}

interface ICombination<T> {
  total: number;
  items: { item: T; num: number }[];
}

function combinations<T>(entries: { item: T; weight: number; num: number }[]): ICombination<T>[] {
  const result = new Map<number, ICombination<T>>([[0, { total: 0, items: [] }]]);
  const sorted = entries.filter((e) => e.num > 0 && e.weight > 0).sort((a, b) => b.weight - a.weight);
  for (const entry of sorted) {
    const before = Array.from(result.values());
    for (const combination of before) {
      for (let count = 1; count <= entry.num; count += 1) {
        if (result.size >= MAX_COMBINATIONS) {
          return Array.from(result.values()).sort((a, b) => a.total - b.total);
        }
        const total = clean(combination.total + entry.weight * count);
        if (!result.has(total)) {
          result.set(total, { total, items: [...combination.items, { item: entry.item, num: count }] });
        }
      }
    }
  }
  return Array.from(result.values()).sort((a, b) => a.total - b.total);
}

interface IAddOnOption {
  total: number;
  builtin?: number;
  plates: IPlateCount[];
}

function addOnOptions(builtin: number[], addOn: IPlateCount[]): IAddOnOption[] {
  const builtins: (number | undefined)[] = [undefined, ...builtin.filter((b) => b > 0)];
  const plateSets = combinations(mergePlates(addOn).map((p) => ({ item: p.weight, weight: p.weight, num: p.num })));
  const options = new Map<number, IAddOnOption>();
  for (const b of builtins) {
    for (const set of plateSets) {
      const total = clean((b ?? 0) + set.total);
      if (!options.has(total)) {
        options.set(total, { total, builtin: b, plates: set.items.map((i) => ({ weight: i.item, num: i.num })) });
      }
    }
  }
  return Array.from(options.values()).sort((a, b) => a.total - b.total);
}

function rangesPicker(
  ranges: IWeightRange[],
  values: number[],
  addOns: IAddOnOption[],
  toInstruction: (value: number, addOn: IAddOnOption) => IEquipmentLoadInstruction
): ILoadPicker {
  const pick = (x: number, direction: "floor" | "ceil"): ILoadOption | undefined => {
    let best: { load: number; value: number; addOn: IAddOnOption } | undefined;
    for (const addOn of addOns) {
      const value =
        direction === "floor"
          ? valuesFloor(ranges, values, x - addOn.total)
          : valuesCeil(ranges, values, x - addOn.total);
      if (value == null) {
        continue;
      }
      const load = clean(value + addOn.total);
      if (best == null || (direction === "floor" ? load > best.load : load < best.load)) {
        best = { load, value, addOn };
      }
    }
    if (best == null) {
      return undefined;
    }
    const chosen = best;
    return { load: chosen.load, build: () => toInstruction(chosen.value, chosen.addOn) };
  };
  return {
    floor: (x) => pick(x, "floor"),
    ceil: (x) => pick(x, "ceil"),
    min: () => pick(-Infinity, "ceil"),
  };
}

function precisionOf(values: number[]): number {
  let maxDecimals = 0;
  for (const value of values) {
    const s = value.toString();
    const dot = s.indexOf(".");
    if (dot >= 0) {
      maxDecimals = Math.max(maxDecimals, s.length - dot - 1);
    }
  }
  return Math.pow(10, Math.min(maxDecimals, 6));
}

function largestPlatesAtMost(inventory: IPlateCount[], target: number): IPlateCount[] | undefined {
  if (target < -EPSILON) {
    return undefined;
  }
  const types = inventory.filter((p) => p.num > 0 && p.weight > 0).sort((a, b) => b.weight - a.weight);
  if (target < EPSILON || types.length === 0) {
    return [];
  }
  const precision = precisionOf([target, ...types.map((t) => t.weight)]);
  const intTarget = Math.round(target * precision);
  const intWeights = types.map((t) => Math.round(t.weight * precision));
  const maxFrom = new Array(types.length + 1).fill(0);
  for (let i = types.length - 1; i >= 0; i--) {
    maxFrom[i] = maxFrom[i + 1] + intWeights[i] * types[i].num;
  }
  const best = new Array(types.length).fill(0);
  const current = new Array(types.length).fill(0);
  let bestRemaining = intTarget + 1;
  let iterations = 0;

  function search(index: number, remaining: number): void {
    if (bestRemaining === 0 || iterations >= MAX_STEPS) {
      return;
    }
    if (remaining === 0 || index >= types.length) {
      if (remaining < bestRemaining) {
        bestRemaining = remaining;
        for (let i = 0; i < types.length; i++) {
          best[i] = i < index ? current[i] : 0;
        }
      }
      return;
    }
    iterations += 1;
    const w = intWeights[index];
    const maxCount = Math.min(types[index].num, w > 0 ? Math.floor(remaining / w) : 0);
    for (let count = maxCount; count >= 0; count--) {
      const newRemaining = remaining - count * w;
      if (newRemaining - maxFrom[index + 1] >= bestRemaining) {
        continue;
      }
      current[index] = count;
      search(index + 1, newRemaining);
      if (bestRemaining === 0) {
        return;
      }
    }
  }

  search(0, intTarget);
  return types.map((t, i) => ({ weight: t.weight, num: best[i] })).filter((p) => p.num > 0);
}

function platesTotal(plates: IPlateCount[]): number {
  return clean(plates.reduce((memo, p) => memo + p.weight * p.num, 0));
}

function subtractPlates(inventory: IPlateCount[], used: IPlateCount[]): IPlateCount[] {
  return inventory.map((p) => {
    const taken = used.find((u) => u.weight === p.weight)?.num ?? 0;
    return { weight: p.weight, num: p.num - taken };
  });
}

function smallestPlatesAtLeast(inventory: IPlateCount[], target: number): IPlateCount[] | undefined {
  const all = platesTotal(inventory);
  if (target > all + EPSILON) {
    return undefined;
  }
  const leftOut = largestPlatesAtMost(inventory, all - target);
  return leftOut == null ? undefined : subtractPlates(inventory, leftOut).filter((p) => p.num > 0);
}

function splitByHorns(
  inventory: IPlateCount[],
  plates: IPlateCount[],
  horns: IEquipmentHorn[]
): { name?: string; plates: IPlateCount[] }[] {
  const loaded = horns.filter((h) => h.ratio > 0);
  if (loaded.length === 0) {
    return [{ plates }];
  }
  const total = platesTotal(plates);
  const ratioSum = loaded.reduce((memo, h) => memo + h.ratio, 0);
  const shares = loaded.map((h) => (total * h.ratio) / ratioSum);
  const split = loadHornByHorn(inventory, total, shares) ?? closestSplit(inventory, total, shares, { steps: 0 });
  const byHorn = split != null ? new Map(loaded.map((h, i) => [h, split.plates[i]])) : handOut(plates, loaded, shares);
  return horns.map((h) => ({ name: h.name, plates: byHorn.get(h) ?? [] }));
}

function loadHornByHorn(
  inventory: IPlateCount[],
  total: number,
  shares: number[]
): { plates: IPlateCount[][] } | undefined {
  const plates: IPlateCount[][] = [];
  let remaining = inventory;
  let loadedSoFar = 0;
  for (let i = 0; i < shares.length; i++) {
    const isLast = i === shares.length - 1;
    const goal = isLast ? clean(total - loadedSoFar) : shares[i];
    const picked = largestPlatesAtMost(remaining, goal) ?? [];
    if (isLast && Math.abs(platesTotal(picked) - goal) > EPSILON) {
      return undefined;
    }
    plates.push(picked);
    loadedSoFar = clean(loadedSoFar + platesTotal(picked));
    remaining = subtractPlates(remaining, picked);
  }
  return { plates };
}

function plateSubsets(inventory: IPlateCount[], maxTotal: number): { plates: IPlateCount[]; total: number }[] {
  let result: { plates: IPlateCount[]; total: number }[] = [{ plates: [], total: 0 }];
  for (const type of inventory.filter((p) => p.num > 0 && p.weight > 0)) {
    const next: { plates: IPlateCount[]; total: number }[] = [];
    for (const subset of result) {
      for (let count = 0; count <= type.num; count += 1) {
        const total = clean(subset.total + type.weight * count);
        if (total > maxTotal + EPSILON || next.length >= MAX_COMBINATIONS) {
          break;
        }
        next.push({
          plates: count > 0 ? [...subset.plates, { weight: type.weight, num: count }] : subset.plates,
          total,
        });
      }
    }
    result = next;
  }
  return result;
}

function plateCount(plates: IPlateCount[]): number {
  return plates.reduce((memo, p) => memo + p.num, 0);
}

function compareHeavierFirst(a: IPlateCount[], b: IPlateCount[]): number {
  const weights = Array.from(new Set([...a, ...b].map((p) => p.weight))).sort((x, y) => y - x);
  for (const weight of weights) {
    const diff = (b.find((p) => p.weight === weight)?.num ?? 0) - (a.find((p) => p.weight === weight)?.num ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function closestSplit(
  inventory: IPlateCount[],
  total: number,
  shares: number[],
  budget: { steps: number }
): { plates: IPlateCount[][]; deviation: number } | undefined {
  if (shares.length === 1) {
    const picked = largestPlatesAtMost(inventory, total) ?? [];
    return Math.abs(platesTotal(picked) - total) > EPSILON
      ? undefined
      : { plates: [picked], deviation: Math.abs(total - shares[0]) };
  }
  const candidates = plateSubsets(inventory, total).sort(
    (a, b) =>
      Math.abs(a.total - shares[0]) - Math.abs(b.total - shares[0]) ||
      plateCount(a.plates) - plateCount(b.plates) ||
      compareHeavierFirst(a.plates, b.plates)
  );
  let best: { plates: IPlateCount[][]; deviation: number } | undefined;
  for (const candidate of candidates) {
    const deviation = Math.abs(candidate.total - shares[0]);
    if ((best != null && deviation >= best.deviation - EPSILON) || budget.steps >= MAX_SPLIT_STEPS) {
      break;
    }
    budget.steps += 1;
    const rest = closestSplit(
      subtractPlates(inventory, candidate.plates),
      clean(total - candidate.total),
      shares.slice(1),
      budget
    );
    if (rest != null && (best == null || deviation + rest.deviation < best.deviation - EPSILON)) {
      best = { plates: [candidate.plates, ...rest.plates], deviation: deviation + rest.deviation };
    }
  }
  return best;
}

function handOut(plates: IPlateCount[], horns: IEquipmentHorn[], shares: number[]): Map<IEquipmentHorn, IPlateCount[]> {
  const loads = horns.map(() => 0);
  const result = new Map<IEquipmentHorn, IPlateCount[]>(horns.map((h) => [h, []]));
  const singles = [...plates]
    .sort((a, b) => b.weight - a.weight)
    .flatMap((p) => new Array<number>(p.num).fill(p.weight));
  for (const weight of singles) {
    let target = 0;
    for (let i = 1; i < horns.length; i++) {
      if (shares[i] - loads[i] > shares[target] - loads[target]) {
        target = i;
      }
    }
    loads[target] += weight;
    const list = result.get(horns[target])!;
    const existing = list.find((p) => p.weight === weight);
    if (existing) {
      existing.num += 1;
    } else {
      list.push({ weight, num: 1 });
    }
  }
  return result;
}

function platesPicker(inventory: IPlateCount[], sides: number, horns: IEquipmentHorn[] | undefined): ILoadPicker {
  const perSide = mergePlates(inventory)
    .map((p) => ({ weight: p.weight, num: Math.floor(p.num / sides) }))
    .filter((p) => p.num > 0);
  const toOption = (plates: IPlateCount[]): ILoadOption => ({
    load: clean(platesTotal(plates) * sides),
    build: () => ({
      type: "plates",
      sides,
      horns: horns && horns.length > 0 ? splitByHorns(perSide, plates, horns) : [{ plates }],
    }),
  });
  return {
    floor: (x) => {
      const plates = largestPlatesAtMost(perSide, x / sides);
      return plates == null ? undefined : toOption(plates);
    },
    ceil: (x) => {
      const plates = smallestPlatesAtLeast(perSide, Math.max(0, x / sides));
      return plates == null ? undefined : toOption(plates);
    },
    min: () => toOption([]),
  };
}

function bandsPicker(setup: IBandsSetup): ILoadPicker {
  const bands = setup.bands.filter((b) => b.num > 0 && b.weight > 0);
  const options: ILoadOption[] = setup.combine
    ? combinations(bands.map((b) => ({ item: b.name, weight: b.weight, num: b.num })))
        .filter((c) => c.total > 0)
        .map((c) => ({
          load: c.total,
          build: () => ({ type: "bands", bands: c.items.map((i) => ({ name: i.item, num: i.num })) }),
        }))
    : bands
        .map((b) => ({ load: b.weight, build: () => ({ type: "bands" as const, bands: [{ name: b.name, num: 1 }] }) }))
        .sort((a, b) => a.load - b.load);
  return {
    floor: (x) => [...options].reverse().find((o) => o.load <= x + EPSILON),
    ceil: (x) => options.find((o) => o.load >= x - EPSILON),
    min: () => options[0],
  };
}

function pickerFor(setup: IEquipmentSetup, isWarmup: boolean): ILoadPicker {
  switch (setup.type) {
    case "stack": {
      const skipAddOns = isWarmup && setup.skipAddOnsInWarmups;
      const addOns = skipAddOns ? addOnOptions([], []) : addOnOptions(setup.builtin ?? [], setup.addOn ?? []);
      return rangesPicker(setup.ranges, [], addOns, (value, addOn) => ({
        type: "stack",
        pin: value,
        builtin: addOn.builtin,
        addOn: addOn.plates,
      }));
    }
    case "plates": {
      const inventory =
        isWarmup && setup.warmupPlates != null
          ? setup.plates.filter((p) => setup.warmupPlates!.indexOf(p.weight) !== -1)
          : setup.plates;
      return platesPicker(inventory, Math.max(1, setup.sides), setup.horns);
    }
    case "fixed":
      return rangesPicker(setup.ranges, setup.values, addOnOptions([], setup.addOn ?? []), (value, addOn) => ({
        type: "fixed",
        value,
        addOn: addOn.plates,
      }));
    case "electric":
      return rangesPicker(
        [{ from: setup.min, to: setup.max, step: setup.step }],
        [],
        addOnOptions([], []),
        (value) => ({ type: "electric", value })
      );
    case "bands":
      return bandsPicker(setup);
  }
}

function hasWarmupInventory(setup: IEquipmentSetup): boolean {
  return (
    (setup.type === "plates" && setup.warmupPlates != null) || (setup.type === "stack" && !!setup.skipAddOnsInWarmups)
  );
}

function scaleFor(setup: IEquipmentSetup, query: IEquipmentLoadQuery): IEffectiveScale {
  const ratio = setup.type === "stack" ? (setup.pullRatio ?? 1) : 1;
  const base = setup.type === "plates" ? setup.base : setup.type === "stack" ? (setup.base ?? 0) * ratio : 0;
  const hasBodyweight = setup.bodyweight != null && query.bodyweight != null;
  const bodyweight =
    hasBodyweight && query.bodyweight
      ? convertForCaller(query.bodyweight.value, query.bodyweight.unit, setup.unit) * (setup.bodyweight?.share ?? 1)
      : 0;
  const start = base + bodyweight;
  const sign = setup.direction === "assists" ? -1 : 1;
  const maxLoad = sign === -1 && hasBodyweight ? clean(start / ratio) : Infinity;
  return { start, ratio, sign, maxLoad };
}

function effective(scale: IEffectiveScale, load: number): number {
  return clean(scale.start + scale.sign * load * scale.ratio);
}

function isMirroredTarget(scale: IEffectiveScale, target: number): boolean {
  const isAssistanceOnly = scale.sign === -1 && scale.start <= 0;
  return target < 0 && !isAssistanceOnly;
}

function loadFor(scale: IEffectiveScale, value: number): number {
  return clean((scale.sign * (value - scale.start)) / scale.ratio);
}

function withinBounds(scale: IEffectiveScale, option: ILoadOption | undefined): ILoadOption | undefined {
  return option != null && option.load <= scale.maxLoad + EPSILON ? option : undefined;
}

function roundLoad(
  picker: ILoadPicker,
  scale: IEffectiveScale,
  loadTarget: number,
  rounding: "down" | "nearest"
): ILoadOption | undefined {
  const below = picker.floor(Math.min(loadTarget, scale.maxLoad));
  if (rounding === "down") {
    return below ?? picker.min();
  }
  const above = withinBounds(scale, picker.ceil(loadTarget));
  if (below == null || above == null) {
    return below ?? above ?? picker.min();
  }
  return above.load - loadTarget < loadTarget - below.load - EPSILON ? above : below;
}

function capLoad(
  picker: ILoadPicker,
  scale: IEffectiveScale,
  option: ILoadOption,
  cap: number
): ILoadOption | undefined {
  if (effective(scale, option.load) <= cap + EPSILON) {
    return option;
  }
  const capLoadValue = loadFor(scale, cap);
  return scale.sign === 1 ? picker.floor(capLoadValue) : withinBounds(scale, picker.ceil(capLoadValue));
}

interface ICallerTarget {
  value: number;
  unit: IUnit;
}

function callerValueOf(
  setup: IEquipmentSetup,
  scale: IEffectiveScale,
  option: ILoadOption,
  caller: ICallerTarget,
  isMirrored: boolean
): number {
  const value = effective(scale, option.load);
  return convertForCaller(isMirrored ? -value : value, setup.unit, caller.unit);
}

function matchingCallerValue(
  setup: IEquipmentSetup,
  scale: IEffectiveScale,
  picker: ILoadPicker,
  loadTarget: number,
  caller: ICallerTarget,
  isMirrored: boolean
): ILoadOption | undefined {
  const candidates = [picker.floor(Math.min(loadTarget, scale.maxLoad)), withinBounds(scale, picker.ceil(loadTarget))];
  return candidates.find(
    (c) =>
      c != null &&
      callerValueOf(setup, scale, c, caller, isMirrored) === convertForCaller(caller.value, caller.unit, caller.unit)
  );
}

function toResult(
  setup: IEquipmentSetup,
  scale: IEffectiveScale,
  option: ILoadOption | undefined,
  caller: ICallerTarget,
  isMirrored: boolean
): IEquipmentLoad {
  if (option == null) {
    return { total: { value: caller.value, unit: caller.unit }, exact: false, unit: setup.unit };
  }
  const value = callerValueOf(setup, scale, option, caller, isMirrored);
  return {
    total: { value, unit: caller.unit },
    exact: value === convertForCaller(caller.value, caller.unit, caller.unit),
    unit: setup.unit,
    instruction: option.build(),
  };
}

function selectIn(
  setup: IEquipmentSetup,
  caller: ICallerTarget,
  query: IEquipmentLoadQuery,
  rounding: "down" | "nearest"
): IEquipmentLoad {
  const scale = scaleFor(setup, query);
  const target = convertExact(caller.value, caller.unit, setup.unit);
  const isMirrored = isMirroredTarget(scale, target);
  const goal = isMirrored ? -target : target;
  const loadTarget = loadFor(scale, goal);
  const hasConversionTolerance = rounding === "down" && scale.sign === 1 && caller.unit !== setup.unit;
  const roundingTarget = hasConversionTolerance ? loadFor(scale, goal + CONVERSION_TOLERANCE) : loadTarget;
  const warmup = query.warmup;
  const cap =
    warmup?.firstWorkingWeight != null && !isMirrored
      ? convertExact(warmup.firstWorkingWeight.value, warmup.firstWorkingWeight.unit, setup.unit)
      : undefined;
  const pickers =
    warmup != null && hasWarmupInventory(setup)
      ? [pickerFor(setup, true), pickerFor(setup, false)]
      : [pickerFor(setup, false)];
  for (const picker of pickers) {
    const option =
      matchingCallerValue(setup, scale, picker, loadTarget, caller, isMirrored) ??
      roundLoad(picker, scale, roundingTarget, rounding);
    const capped = option != null && cap != null ? capLoad(picker, scale, option, cap) : option;
    if (capped != null || option == null) {
      return toResult(setup, scale, capped, caller, isMirrored);
    }
  }
  return toResult(setup, scale, pickers[pickers.length - 1].min(), caller, isMirrored);
}

export function EquipmentLoadSolver_select(
  setup: IEquipmentSetup,
  target: IWeight,
  query: IEquipmentLoadQuery
): IEquipmentLoad {
  return selectIn(setup, target, query, setup.rounding ?? "down");
}

export function EquipmentLoadSolver_realize(
  setup: IEquipmentSetup,
  weight: IWeight,
  query: IEquipmentLoadQuery
): IEquipmentLoad {
  const withAllPlates: IEquipmentLoadQuery = { bodyweight: query.bodyweight };
  const attempts = query.warmup != null ? [{ ...withAllPlates, warmup: {} }, withAllPlates] : [withAllPlates];
  for (const attempt of attempts) {
    const load = selectIn(setup, weight, attempt, "nearest");
    if (load.exact) {
      return load;
    }
  }
  return selectIn(setup, weight, withAllPlates, "down");
}

function step(setup: IEquipmentSetup, weight: IWeight, query: IEquipmentLoadQuery, direction: 1 | -1): IWeight {
  const picker = pickerFor(setup, false);
  const scale = scaleFor(setup, query);
  let value = convertExact(weight.value, weight.unit, setup.unit);
  const isMirrored = isMirroredTarget(scale, value);
  const towards = (isMirrored ? -direction : direction) * scale.sign;
  if (isMirrored) {
    value = -value;
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const load = loadFor(scale, value);
    const option =
      towards === 1 ? withinBounds(scale, picker.ceil(load + STEP_OFFSET)) : picker.floor(load - STEP_OFFSET);
    if (option == null) {
      return weight;
    }
    value = effective(scale, option.load);
    const result = convertForCaller(isMirrored ? -value : value, setup.unit, weight.unit);
    if (result !== weight.value) {
      return { value: result, unit: weight.unit };
    }
  }
  return weight;
}

export function EquipmentLoadSolver_next(setup: IEquipmentSetup, weight: IWeight, query: IEquipmentLoadQuery): IWeight {
  return step(setup, weight, query, 1);
}

export function EquipmentLoadSolver_previous(
  setup: IEquipmentSetup,
  weight: IWeight,
  query: IEquipmentLoadQuery
): IWeight {
  return step(setup, weight, query, -1);
}

export function EquipmentLoadSolver_reachable(
  setup: IEquipmentSetup,
  query: IEquipmentLoadQuery,
  limit: number
): { values: number[]; truncated: boolean } {
  const picker = pickerFor(setup, false);
  const scale = scaleFor(setup, query);
  const values: number[] = [];
  let option = withinBounds(scale, picker.min());
  while (option != null && values.length < limit) {
    values.push(effective(scale, option.load));
    const next = withinBounds(scale, picker.ceil(option.load + STEP_OFFSET));
    option = next != null && next.load > option.load ? next : undefined;
  }
  values.sort((a, b) => a - b);
  return { values, truncated: option != null };
}
