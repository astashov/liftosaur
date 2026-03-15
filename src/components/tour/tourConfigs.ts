import { IState } from "../../models/state";
import { Tour_stepHelpFlag } from "./tourTypes";
import { workoutTourConfig } from "./workoutTourConfig";

export const tourConfigs = {
  workout: workoutTourConfig,
} as const;

export function TourConfigs_findTourId(state: IState, checkSeen?: boolean): keyof typeof tourConfigs | undefined {
  for (const config of Object.values(tourConfigs)) {
    if (config.shouldStart?.(state)) {
      for (const step of config.steps) {
        const helpId = Tour_stepHelpFlag(config.id, step.id);
        const alreadySeen = !checkSeen || state.storage.helps.includes(helpId);
        if (!alreadySeen && step.condition && !step.condition(state)) {
          return config.id;
        }
      }
    }
  }
  return undefined;
}
