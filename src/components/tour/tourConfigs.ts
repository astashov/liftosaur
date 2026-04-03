import { IState, ITourId } from "../../models/state";
import { Tour_stepHelpFlag } from "./tourTypes";
import { workoutTourConfig } from "./workoutTourConfig";
import { programTourConfig } from "./programTourConfig";
import { editProgramExerciseTourConfig } from "./editProgramExerciseTourConfig";

export const tourConfigs: Record<ITourId, import("./tourTypes").ITourConfig> = {
  workout: workoutTourConfig,
  program: programTourConfig,
  editProgramExercise: editProgramExerciseTourConfig,
};

export function TourConfigs_findTourId(state: IState, checkSeen?: boolean): ITourId | undefined {
  for (const config of Object.values(tourConfigs)) {
    if (config.shouldStart?.(state)) {
      for (const step of config.steps) {
        const helpId = Tour_stepHelpFlag(config.id, step.id);
        const alreadySeen = state.storage.helps.includes(helpId);
        if ((!checkSeen || !alreadySeen) && (!step.condition || step.condition(state))) {
          return config.id;
        }
      }
    }
  }
  return undefined;
}
