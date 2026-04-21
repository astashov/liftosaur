import type { IAllCustomExercises, IProgramState } from "../../../types";
import type { PlannerSyntaxError } from "../plannerExerciseEvaluator";
import type { LiftoscriptSyntaxError } from "../../../liftoscriptEvaluator";

export type IEditorMode = "planner" | "script";
export type IEditorTheme = "light" | "dark";

export type IEditorError = PlannerSyntaxError | LiftoscriptSyntaxError;

export interface IEditorInitArgs {
  mode: IEditorMode;
  value: string;
  lineNumbers?: boolean;
  theme?: IEditorTheme;
  error?: IEditorError;
  customExercises?: IAllCustomExercises;
  exerciseFullNames?: string[];
  state?: IProgramState;
  autoHeight?: boolean;
}

export type IHostToWebview =
  | { kind: "init"; payload: IEditorInitArgs }
  | { kind: "setValue"; payload: { value: string } }
  | { kind: "setError"; payload: { error?: IEditorError } }
  | { kind: "setCustomExercises"; payload: { customExercises: IAllCustomExercises } }
  | { kind: "setExerciseFullNames"; payload: { names: string[] } }
  | { kind: "setState"; payload: { state: IProgramState } }
  | { kind: "setTheme"; payload: { theme: IEditorTheme } }
  | { kind: "focus" }
  | { kind: "blur" };

export type IWebviewToHost =
  | { kind: "ready" }
  | { kind: "change"; payload: { value: string } }
  | { kind: "lineChange"; payload: { line: number } }
  | { kind: "blur"; payload: { value: string } }
  | { kind: "heightChange"; payload: { height: number } }
  | { kind: "error"; payload: { message: string } };

export const EDITOR_BRIDGE_CHANNEL = "liftosaurEditorBridge";
