import { JSX } from "preact";
import { IState } from "../../models/state";
import { tourConfigs } from "./tourConfigs";

export interface ITourStep {
  id: string;
  title: string;
  content: (state: IState) => JSX.Element;
  dino: string;
  condition?: (state: IState) => boolean;
  waitFor?: (state: IState) => boolean;
}

export interface ITourConfig {
  id: keyof typeof tourConfigs;
  steps: ITourStep[];
  shouldStart?: (state: IState) => boolean;
  waitForNextTrigger?: (stepId: string, state: IState) => boolean;
}

export function Tour_stepHelpFlag(configId: string, stepId: string): string {
  return `${configId}.${stepId}`;
}
