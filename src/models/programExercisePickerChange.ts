import { Exercise_fullName, Exercise_get } from "./exercise";
import { PlannerProgram_replaceExercise } from "../pages/planner/models/plannerProgram";
import { ObjectUtils_clone } from "../utils/object";
import {
  EditProgramUiHelpers_changeAllInstances,
  EditProgramUiHelpers_duplicateCurrentInstance,
} from "../components/editProgram/editProgramUi/editProgramUiHelpers";
import { ProgramRewrite_changedKeys } from "./programRewrite";
import type { IExercisePickerSelectedExercise, IPlannerProgram, ISettings, IShortDayData } from "../types";
import type { IPlannerProgramExercise } from "../pages/planner/models/types";

export type IProgramExercisePickerChange = "one" | "all" | "duplicate" | "variationAdd" | "variationEdit";

export interface IProgramExercisePickerResult {
  planner: IPlannerProgram;
  description: string;
  isAdd: boolean;
  newKey?: string;
}

export function ProgramExercisePickerChange_apply(args: {
  planner: IPlannerProgram;
  settings: ISettings;
  selectedExercises: IExercisePickerSelectedExercise[];
  plannerExercise: IPlannerProgramExercise | undefined;
  dayData: IShortDayData;
  change: IProgramExercisePickerChange;
  variationIndex: number | undefined;
}): IProgramExercisePickerResult | undefined {
  const { planner, settings, selectedExercises, plannerExercise, dayData, change, variationIndex } = args;
  const selectedExercise = selectedExercises[0];
  if (!selectedExercise) {
    return undefined;
  }
  const newExerciseType = selectedExercise.type === "template" ? selectedExercise.name : selectedExercise.exerciseType;
  const newLabel = "label" in selectedExercise ? selectedExercise.label : undefined;
  const dayInProgram = { week: dayData.week, dayInWeek: dayData.dayInWeek, day: 1 };

  if (plannerExercise == null) {
    return addExercises(planner, settings, selectedExercises, dayData);
  }
  if (change === "variationAdd" || change === "variationEdit") {
    const isTemplatePick = typeof newExerciseType === "string";
    if (isTemplatePick || newExerciseType == null) {
      return undefined;
    }
    const exercise = Exercise_get(newExerciseType, settings.exercises);
    const newPlanner = EditProgramUiHelpers_changeAllInstances(planner, plannerExercise.key, settings, true, (ex) => {
      const variations = ex.exerciseVariations ?? [];
      if (change === "variationAdd") {
        variations.push({ exerciseType: newExerciseType, name: exercise.name, isCurrent: false });
      } else if (variationIndex != null && variations[variationIndex] != null) {
        variations[variationIndex] = {
          exerciseType: newExerciseType,
          name: exercise.name,
          isCurrent: variations[variationIndex].isCurrent,
        };
      }
      ex.exerciseVariations = variations;
      // A lone rung serializes via ex.exerciseType, so keep it aligned with the current variation.
      const current = variations.find((v) => v.isCurrent);
      if (current?.exerciseType != null) {
        ex.exerciseType = current.exerciseType;
      }
    });
    return withNewKey(planner, newPlanner, plannerExercise, settings, "Change exercise variation");
  }
  if (change === "one") {
    const newPlanner = PlannerProgram_replaceExercise(
      planner,
      plannerExercise.key,
      newLabel,
      newExerciseType,
      settings,
      dayInProgram
    );
    return { planner: newPlanner, description: "Replace one exercise in planner", isAdd: false };
  }
  if (change === "duplicate") {
    const newPlanner = EditProgramUiHelpers_duplicateCurrentInstance(
      planner,
      dayInProgram,
      plannerExercise.fullName,
      newLabel,
      newExerciseType,
      settings
    );
    return { planner: newPlanner, description: "Duplicate exercise in planner", isAdd: false };
  }
  const newPlanner = PlannerProgram_replaceExercise(planner, plannerExercise.key, newLabel, newExerciseType, settings);
  return withNewKey(planner, newPlanner, plannerExercise, settings, "Replace all exercises in planner");
}

function withNewKey(
  planner: IPlannerProgram,
  newPlanner: IPlannerProgram,
  plannerExercise: IPlannerProgramExercise,
  settings: ISettings,
  description: string
): IProgramExercisePickerResult {
  const newKey = ProgramRewrite_changedKeys(planner, newPlanner, settings)[plannerExercise.key];
  return { planner: newPlanner, description, isAdd: false, newKey: newKey ?? undefined };
}

function addExercises(
  planner: IPlannerProgram,
  settings: ISettings,
  selectedExercises: IExercisePickerSelectedExercise[],
  dayData: IShortDayData
): IProgramExercisePickerResult | undefined {
  const newPlanner = ObjectUtils_clone(planner);
  const day = newPlanner.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
  const exerciseText = day?.exerciseText;
  if (day == null || exerciseText == null) {
    return undefined;
  }
  const newLines = selectedExercises.reduce<string[]>((acc, selected) => {
    const exerciseType = selected.type === "template" ? selected.name : selected.exerciseType;
    const label = "label" in selected ? selected.label : undefined;
    let fullName: string | undefined;
    if (typeof exerciseType === "string") {
      fullName = `${label ? `${label}: ` : ""}${exerciseType} / used: none`;
    } else if (exerciseType != null) {
      fullName = Exercise_fullName(Exercise_get(exerciseType, settings.exercises), settings, label);
    }
    return fullName != null ? [...acc, `${fullName} / 1x1 100${settings.units}`] : acc;
  }, []);
  if (newLines.length === 0) {
    return undefined;
  }
  const added = newLines.join("\n");
  day.exerciseText = exerciseText.trim() ? exerciseText + `\n${added}` : added;
  return {
    planner: newPlanner,
    description: `Add ${newLines.length > 1 ? `${newLines.length} exercises` : "exercise"} to exercise text`,
    isAdd: true,
  };
}
