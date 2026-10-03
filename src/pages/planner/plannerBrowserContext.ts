import { createContext, JSX } from "react";
import type { IPlannerGridProps } from "./components/plannerGrid";
import type { IModalPlannerExercisePickerProps } from "./components/modalPlannerExercisePicker";

export interface IPlannerBrowserComponents {
  Grid: (props: IPlannerGridProps) => JSX.Element;
  ExercisePicker: (props: IModalPlannerExercisePickerProps) => JSX.Element;
}

// Provided only by the browser entries. The lambda bundle compiles every static import of the
// page, so the grid and the picker (and react-native-reanimated) stay out of it by never being imported here.
export const PlannerBrowserContext = createContext<IPlannerBrowserComponents | undefined>(undefined);
