import { IEquipmentSetup, IPlateCount, IWeight } from "../types";
import { CollectionUtils_compressArray } from "../utils/collection";
import { IEquipmentLoad, IEquipmentLoadInstruction } from "./equipmentLoadSolver";

function singlePlates(plates: IPlateCount[]): number[] {
  return [...plates].sort((a, b) => b.weight - a.weight).flatMap((p) => new Array<number>(p.num).fill(p.weight));
}

function platesText(plates: IPlateCount[]): string {
  return CollectionUtils_compressArray(singlePlates(plates), 3).join("/");
}

export interface IEquipmentHornBar {
  name?: string;
  plates: IWeight[];
  text: string;
}

export function EquipmentLoadText_hornBars(load: IEquipmentLoad): IEquipmentHornBar[] | undefined {
  const instruction = load.instruction;
  if (instruction?.type !== "plates") {
    return undefined;
  }
  const bars = instruction.horns
    .filter((h) => h.plates.length > 0)
    .map((h) => ({
      name: h.name,
      plates: singlePlates(h.plates).map((value) => ({ value, unit: load.unit })),
      text: platesText(h.plates),
    }));
  return bars.length > 0 ? bars : undefined;
}

function addOnText(plates: IPlateCount[]): string {
  return plates.length > 0 ? ` + ${platesText(plates)}` : "";
}

function instructionText(instruction: IEquipmentLoadInstruction): string {
  switch (instruction.type) {
    case "stack": {
      const builtin = instruction.builtin != null ? ` + ${instruction.builtin}` : "";
      return `Pin ${instruction.pin}${builtin}${addOnText(instruction.addOn)}`;
    }
    case "plates": {
      if (instruction.horns.length === 1 && instruction.horns[0].name == null) {
        return platesText(instruction.horns[0].plates);
      }
      return instruction.horns
        .filter((h) => h.plates.length > 0)
        .map((h) => `${h.name ?? ""} ${platesText(h.plates)}`.trim())
        .join(" · ");
    }
    case "fixed":
      return `${instruction.value}${addOnText(instruction.addOn)}`;
    case "electric":
      return `${instruction.value}`;
    case "bands":
      return instruction.bands.map((b) => (b.num > 1 ? `${b.num} × ${b.name}` : b.name)).join(" + ");
  }
}

export function EquipmentLoadText_format(load: IEquipmentLoad): string {
  return load.instruction != null ? instructionText(load.instruction) : "";
}

export function EquipmentLoadText_line(load: IEquipmentLoad | undefined): string {
  return load != null ? EquipmentLoadText_format(load) : "";
}

export interface IEquipmentTryResult {
  main: string;
  handle?: string;
  difference?: string;
  status: "exact" | "over" | "under" | "none";
}

function roundForText(value: number): number {
  return Math.round(value * 100) / 100;
}

export function EquipmentLoadText_tryResult(
  setup: IEquipmentSetup,
  load: IEquipmentLoad,
  target: IWeight
): IEquipmentTryResult {
  const main = EquipmentLoadText_format(load);
  if (load.instruction == null || main === "") {
    return { main: "Nothing to load", status: "none" };
  }
  const total = `${roundForText(load.total.value)} ${load.total.unit}`;
  const hasPullRatio = setup.type === "stack" && setup.pullRatio != null && setup.pullRatio !== 1;
  const handle = hasPullRatio ? `= ${total} at the handle` : undefined;
  if (load.exact) {
    return { main, handle, status: "exact" };
  }
  const diff = roundForText(Math.abs(load.total.value - target.value));
  const isOver = load.total.value > target.value;
  return {
    main,
    handle: handle ?? `= ${total}`,
    difference: `${diff} ${target.unit} ${isOver ? "over" : "under"} ${roundForText(target.value)} · ${roundingReason(setup, isOver)}`,
    status: isOver ? "over" : "under",
  };
}

function roundingReason(setup: IEquipmentSetup, isOver: boolean): string {
  if (setup.rounding === "nearest") {
    return "closest you can load";
  }
  if (!isOver) {
    return "rounded down";
  }
  return setup.direction === "assists" ? "assistance rounded down" : "lightest you can load";
}
