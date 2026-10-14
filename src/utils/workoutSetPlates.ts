import { IExerciseType, ISet, ISettings, IWeight } from "../types";
import { Equipment_getEquipmentNameForExerciseType } from "../models/equipment";
import { Exercise_get } from "../models/exercise";
import { Weight_build, Weight_realizeLoad } from "../models/weight";
import { IEquipmentLoad } from "../models/equipmentLoadSolver";
import { EquipmentLoadText_line } from "../models/equipmentLoadText";

export interface IWorkoutSetPlatesLine {
  plates: string;
  sidePlates: IWeight[];
  isMatch: boolean;
}

function sidePlatesOf(load: IEquipmentLoad): IWeight[] {
  const instruction = load.instruction;
  if (instruction?.type !== "plates" || instruction.horns.length !== 1) {
    return [];
  }
  return [...instruction.horns[0].plates]
    .sort((a, b) => b.weight - a.weight)
    .flatMap((p) => new Array<IWeight>(p.num).fill(Weight_build(p.weight, load.unit)));
}

export function WorkoutSetPlates_line(
  set: ISet,
  settings: ISettings,
  exerciseType: IExerciseType,
  isWarmup: boolean
): IWorkoutSetPlatesLine | undefined {
  const target = set.completedWeight ?? set.weight;
  if (target == null) {
    return undefined;
  }
  const exercise = Exercise_get(exerciseType, settings.exercises);
  if (Equipment_getEquipmentNameForExerciseType(settings, exercise) == null) {
    return undefined;
  }
  const load = Weight_realizeLoad(target, settings, exerciseType, isWarmup);
  const text = EquipmentLoadText_line(load);
  if (load == null || text === "") {
    return undefined;
  }
  return { plates: text, sidePlates: sidePlatesOf(load), isMatch: load.exact };
}
