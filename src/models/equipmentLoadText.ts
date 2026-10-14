import { IPlateCount } from "../types";
import { CollectionUtils_compressArray } from "../utils/collection";
import { IEquipmentLoad, IEquipmentLoadInstruction } from "./equipmentLoadSolver";

function platesText(plates: IPlateCount[]): string {
  const singles = [...plates]
    .sort((a, b) => b.weight - a.weight)
    .flatMap((p) => new Array<number>(p.num).fill(p.weight));
  return CollectionUtils_compressArray(singles, 3).join("/");
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
