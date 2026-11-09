import {
  ILiftographModelFormat,
  ILiftographWidgetModel,
  LiftographWidgetModel_read,
  LiftographWidgetModel_write,
} from "../liftograph/liftographWidgetModel";

export type IDashboardWidgetSheetMode = "form" | "text";

export interface IDashboardWidgetSheetState {
  mode: IDashboardWidgetSheetMode;
  model: ILiftographWidgetModel;
  text: string;
  isTouched: boolean;
  formError?: string;
}

export const DashboardWidgetSheet_formError =
  "This text can't be shown as a form. Fix the errors, or finish editing it as text.";

export function DashboardWidgetSheet_init(
  model: ILiftographWidgetModel,
  mode: IDashboardWidgetSheetMode,
  format: ILiftographModelFormat
): IDashboardWidgetSheetState {
  const state: IDashboardWidgetSheetState = { mode: "form", model, text: "", isTouched: false };
  return mode === "text" ? DashboardWidgetSheet_toText(state, format) : state;
}

export function DashboardWidgetSheet_isPreviewCollapsible(kind: ILiftographWidgetModel["kind"]): boolean {
  return kind === "muscles";
}

export function DashboardWidgetSheet_setModel(
  state: IDashboardWidgetSheetState,
  model: ILiftographWidgetModel
): IDashboardWidgetSheetState {
  return model === state.model ? state : { ...state, model, isTouched: true };
}

export function DashboardWidgetSheet_isPreviewPinned(kind: ILiftographWidgetModel["kind"]): boolean {
  return kind === "graph" || kind === "value";
}

export function DashboardWidgetSheet_setText(
  state: IDashboardWidgetSheetState,
  text: string
): IDashboardWidgetSheetState {
  return text === state.text ? state : { ...state, text, isTouched: true, formError: undefined };
}

export function DashboardWidgetSheet_toText(
  state: IDashboardWidgetSheetState,
  format: ILiftographModelFormat
): IDashboardWidgetSheetState {
  if (state.mode === "text") {
    return state;
  }
  return { ...state, mode: "text", text: LiftographWidgetModel_write(state.model, format), formError: undefined };
}

export function DashboardWidgetSheet_toForm(state: IDashboardWidgetSheetState): IDashboardWidgetSheetState {
  if (state.mode === "form") {
    return state;
  }
  const model = LiftographWidgetModel_read(state.text);
  if (model == null) {
    return { ...state, formError: DashboardWidgetSheet_formError };
  }
  return { ...state, mode: "form", model, formError: undefined };
}

export function DashboardWidgetSheet_written(
  state: IDashboardWidgetSheetState,
  format: ILiftographModelFormat
): string {
  return state.mode === "text" ? state.text : LiftographWidgetModel_write(state.model, format);
}
