import { IPlannerBrowserComponents } from "./plannerBrowserContext";
import { PlannerGrid } from "./components/plannerGrid";
import { ModalPlannerExercisePicker } from "./components/modalPlannerExercisePicker";

export const plannerBrowserComponents: IPlannerBrowserComponents = {
  Grid: PlannerGrid,
  ExercisePicker: ModalPlannerExercisePicker,
};
