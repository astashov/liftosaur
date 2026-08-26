import type { PlannerSyntaxError } from "./pages/planner/plannerExerciseEvaluator";
import type { LiftoscriptSyntaxError } from "./liftoscriptEvaluator";

export type IEditorMode = "planner" | "script";
export type IEditorTheme = "light" | "dark";

export type IEditorError = PlannerSyntaxError | LiftoscriptSyntaxError;
