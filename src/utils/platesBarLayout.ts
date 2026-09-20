import { IWeight } from "../types";
import { Weight_convertTo } from "../models/weight";

export type IPlateColor = "red" | "blue" | "yellow" | "green" | "white" | "iron";

export interface IPlatesBarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IPlatesBarPlate extends IPlatesBarRect {
  color: IPlateColor;
}

export interface IPlatesBarLayout {
  width: number;
  height: number;
  shaft: IPlatesBarRect;
  collar: IPlatesBarRect;
  sleeve: IPlatesBarRect;
  plates: IPlatesBarPlate[];
}

const HEIGHT = 26;
const SHAFT = { width: 6, height: 5 };
const COLLAR = { width: 3, height: 11 };
const SLEEVE = { width: 7, height: 4 };
const PLATE_GAP = 1.5;
const MAX_DRAWN_PLATES = 12;

const KG_COLORS: Record<number, IPlateColor> = {
  25: "red",
  20: "blue",
  15: "yellow",
  10: "green",
  5: "white",
  2.5: "red",
  2: "blue",
  1.5: "yellow",
  1: "green",
  0.5: "white",
};

const LB_COLORS: Record<number, IPlateColor> = {
  55: "red",
  45: "blue",
  35: "yellow",
  25: "green",
  10: "white",
};

export function PlatesBarLayout_color(plate: IWeight): IPlateColor {
  const table = plate.unit === "kg" ? KG_COLORS : LB_COLORS;
  return table[plate.value] ?? "iron";
}

function plateSize(plate: IWeight): { width: number; heightRatio: number } {
  const kg = Weight_convertTo(plate, "kg").value;
  if (kg >= 10) {
    return { width: 6, heightRatio: 1 };
  } else if (kg >= 4) {
    return { width: 4.5, heightRatio: 0.72 };
  } else if (kg >= 2) {
    return { width: 3.5, heightRatio: 0.55 };
  } else {
    return { width: 3, heightRatio: 0.42 };
  }
}

function centered(x: number, width: number, height: number): IPlatesBarRect {
  return { x, y: (HEIGHT - height) / 2, width, height };
}

export function PlatesBarLayout_build(sidePlates: IWeight[]): IPlatesBarLayout {
  const shaft = centered(0, SHAFT.width, SHAFT.height);
  const collar = centered(shaft.x + shaft.width, COLLAR.width, COLLAR.height);
  let x = collar.x + collar.width + PLATE_GAP;
  const plates: IPlatesBarPlate[] = [];
  for (const plate of sidePlates.slice(0, MAX_DRAWN_PLATES)) {
    const size = plateSize(plate);
    const height = Math.round(HEIGHT * size.heightRatio);
    plates.push({ ...centered(x, size.width, height), color: PlatesBarLayout_color(plate) });
    x += size.width + PLATE_GAP;
  }
  const sleeve = centered(x - PLATE_GAP, SLEEVE.width, SLEEVE.height);
  return { width: sleeve.x + sleeve.width, height: HEIGHT, shaft, collar, sleeve, plates };
}
