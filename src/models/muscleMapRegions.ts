import { IMuscle, IScreenMuscle, ISettings } from "../types";
import { Muscle_getMusclesFromScreenMuscle } from "./muscle";
import { IMuscleMapPath, MuscleMapPaths_back, MuscleMapPaths_front } from "./muscleMapPaths";
import { ObjectUtils_keys } from "../utils/object";

export type IMuscleMapSide = "front" | "back";

export interface IMuscleStyle {
  fill?: string;
  opacity?: number;
}

export type IMuscleMapRegionStyles = Record<IMuscleMapSide, Partial<Record<string, IMuscleStyle>>>;

export interface IMuscleIconView {
  side: IMuscleMapSide;
  viewBox: [number, number, number, number];
  regions: { key: string; isGroup: boolean }[];
}

export const MuscleMapRegions_viewBox: [number, number, number, number] = [24, 0, 208, 370];

const iconAspectRatio = 61 / 48;
const iconMinHeight = 60;
const iconMargin = 6;

const regionsByMuscle: Record<IMuscleMapSide, Partial<Record<IMuscle, string[]>>> = {
  front: {
    "Pectoralis Major Clavicular Head": ["013", "014"],
    "Pectoralis Major Sternal Head": ["015", "016"],
    "Deltoid Anterior": ["011", "012"],
    "Deltoid Lateral": ["009", "010"],
    "Biceps Brachii": ["017", "019", "017-short", "019-short"],
    Brachialis: ["018", "020", "033", "034"],
    Brachioradialis: ["035", "036"],
    "Wrist Flexors": ["039", "040", "043", "044", "045", "046", "049", "050"],
    "Wrist Extensors": ["021-forearm", "022-forearm", "051", "052"],
    "Rectus Abdominis": ["025", "026", "029", "030", "037", "038", "047", "048"],
    Obliques: ["031", "032", "041", "042"],
    Iliopsoas: ["031", "032"],
    "Serratus Anterior": ["023", "024", "027", "028"],
    Quadriceps: ["059", "060", "063", "064", "071", "072", "073"],
    Sartorius: ["055", "056"],
    "Adductor Magnus": ["057", "058"],
    "Adductor Brevis": ["057", "058"],
    "Adductor Longus": ["057", "058"],
    Pectineous: ["057", "058"],
    "Tensor Fasciae Latae": ["053", "054"],
    "Tibialis Anterior": ["085", "086"],
    Gastrocnemius: ["082", "083"],
    Soleus: ["080", "081", "084"],
    Sternocleidomastoid: ["002", "003", "007", "008"],
    Splenius: ["002", "003", "007", "008"],
    "Trapezius Upper Fibers": ["005", "006"],
  },
  back: {
    "Deltoid Posterior": ["008", "009"],
    "Trapezius Upper Fibers": ["002", "003"],
    "Trapezius Middle Fibers": ["004", "005"],
    "Trapezius Lower Fibers": ["011", "012"],
    "Latissimus Dorsi": ["026", "027"],
    "Erector Spinae": ["030", "031"],
    Infraspinatus: ["010", "013", "024", "025"],
    "Teres Minor": ["014", "015"],
    "Teres Major": ["018", "019"],
    "Triceps Brachii": ["016", "017", "020", "021", "028", "029"],
    "Wrist Extensors": [
      "037",
      "038",
      "039",
      "040",
      "041",
      "042",
      "043",
      "044",
      "045",
      "046",
      "047",
      "048",
      "049",
      "050",
      "054",
      "056",
      "057",
      "058",
    ],
    "Gluteus Maximus": ["059", "060"],
    "Gluteus Medius": ["051", "052"],
    Hamstrings: ["069", "070", "071", "072", "073", "074"],
    Gastrocnemius: ["081", "082", "083", "084"],
    Soleus: [
      "089-soleus-muscle-1",
      "090-soleus-muscle-1",
      "091-soleus-muscle-1",
      "091-soleus-muscle-2",
      "093-soleus-muscle-1",
    ],
  },
};

export function MuscleMapRegions_paths(side: IMuscleMapSide): Record<string, IMuscleMapPath> {
  return side === "front" ? MuscleMapPaths_front : MuscleMapPaths_back;
}

export function MuscleMapRegions_ofMuscle(side: IMuscleMapSide, muscle: IMuscle): string[] {
  return regionsByMuscle[side][muscle] ?? [];
}

export function MuscleMapRegions_styles(
  intensityByGroup: Partial<Record<IScreenMuscle, number>>,
  intensityByUngroupedMuscle: Partial<Record<IMuscle, number>>,
  settings: ISettings,
  fill: string
): IMuscleMapRegionStyles {
  const clamp = (value: number | undefined): number => Math.min(1, Math.max(0, value ?? 0));
  const intensityByMuscle: Partial<Record<IMuscle, number>> = {};
  for (const muscleGroup of Object.keys(intensityByGroup)) {
    const intensity = clamp(intensityByGroup[muscleGroup]);
    for (const muscle of Muscle_getMusclesFromScreenMuscle(muscleGroup, settings)) {
      intensityByMuscle[muscle] = Math.max(intensityByMuscle[muscle] ?? 0, intensity);
    }
  }
  for (const muscle of ObjectUtils_keys(intensityByUngroupedMuscle)) {
    intensityByMuscle[muscle] = Math.max(intensityByMuscle[muscle] ?? 0, clamp(intensityByUngroupedMuscle[muscle]));
  }
  const styles: IMuscleMapRegionStyles = { front: {}, back: {} };
  for (const side of ["front", "back"] as const) {
    for (const muscle of ObjectUtils_keys(intensityByMuscle)) {
      const intensity = intensityByMuscle[muscle] ?? 0;
      for (const region of MuscleMapRegions_ofMuscle(side, muscle)) {
        const current = styles[side][region]?.opacity ?? 0;
        if (intensity >= current) {
          styles[side][region] = { opacity: intensity, fill };
        }
      }
    }
  }
  return styles;
}

function boxesIntersect(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function groupRegions(side: IMuscleMapSide, muscles: IMuscle[]): string[] {
  return Array.from(new Set(muscles.flatMap((muscle) => MuscleMapRegions_ofMuscle(side, muscle))));
}

function cropBox(boxes: [number, number, number, number][]): [number, number, number, number] {
  const x0 = Math.min(...boxes.map((b) => b[0])) - iconMargin;
  const y0 = Math.min(...boxes.map((b) => b[1])) - iconMargin;
  const x1 = Math.max(...boxes.map((b) => b[2])) + iconMargin;
  const y1 = Math.max(...boxes.map((b) => b[3])) + iconMargin;
  const height = Math.max(iconMinHeight, y1 - y0, (x1 - x0) / iconAspectRatio);
  const width = height * iconAspectRatio;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [cx - width / 2, cy - height / 2, width, height];
}

export function MuscleMapRegions_iconView(
  muscleGroup: IScreenMuscle,
  settings: ISettings
): IMuscleIconView | undefined {
  const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, settings);
  const sides = (["front", "back"] as const).map((side) => {
    const regions = groupRegions(side, muscles);
    const paths = MuscleMapRegions_paths(side);
    const area = regions.reduce((sum, region) => sum + paths[region].area, 0);
    return { side, regions, area };
  });
  const best = sides[1].area > sides[0].area ? sides[1] : sides[0];
  if (best.regions.length === 0) {
    return undefined;
  }
  const paths = MuscleMapRegions_paths(best.side);
  const viewBox = cropBox(best.regions.map((region) => paths[region].box));
  const crop: [number, number, number, number] = [
    viewBox[0],
    viewBox[1],
    viewBox[0] + viewBox[2],
    viewBox[1] + viewBox[3],
  ];
  const groupSet = new Set(best.regions);
  const regions = Object.keys(paths)
    .filter((key) => boxesIntersect(paths[key].box, crop))
    .map((key) => ({ key, isGroup: groupSet.has(key) }));
  return { side: best.side, viewBox, regions };
}
