import { IProgramExerciseTextError } from "./programExerciseText";

export type IExercisePreviewPassState =
  | { phase: "closed"; token: number }
  | { phase: "settled"; token: number; panelText: string }
  | { phase: "scheduled"; token: number; panelText: string }
  | { phase: "applying"; token: number; panelText: string }
  | { phase: "failed"; token: number; panelText: string; error: IProgramExerciseTextError };

export type IExercisePreviewPassApplyResult = { blurb: string } | { error: IProgramExerciseTextError };

export type IExercisePreviewPassEffect =
  | { type: "schedule"; token: number }
  | { type: "cancel" }
  | { type: "applyPreview"; token: number; panelText: string }
  | { type: "syncLine"; blurb: string };

export interface IExercisePreviewPassStep {
  state: IExercisePreviewPassState;
  effects: IExercisePreviewPassEffect[];
  result?: IExercisePreviewPassApplyResult;
}

export function ExercisePreviewPass_initial(): IExercisePreviewPassState {
  return { phase: "closed", token: 0 };
}

export function ExercisePreviewPass_isPending(state: IExercisePreviewPassState): boolean {
  return state.phase === "scheduled" || state.phase === "applying" || state.phase === "failed";
}

export function ExercisePreviewPass_error(state: IExercisePreviewPassState): IProgramExerciseTextError | undefined {
  return state.phase === "failed" ? state.error : undefined;
}

function cancelIfScheduled(state: IExercisePreviewPassState): IExercisePreviewPassEffect[] {
  return state.phase === "scheduled" ? [{ type: "cancel" }] : [];
}

function startApply(state: IExercisePreviewPassState, panelText: string): IExercisePreviewPassStep {
  const token = state.token + 1;
  return {
    state: { phase: "applying", token, panelText },
    effects: [...cancelIfScheduled(state), { type: "applyPreview", token, panelText }],
  };
}

export function ExercisePreviewPass_textChanged(
  state: IExercisePreviewPassState,
  panelText: string,
  isKeypadActive: boolean
): IExercisePreviewPassStep {
  if (!isKeypadActive) {
    return startApply(state, panelText);
  }
  const token = state.token + 1;
  return {
    state: { phase: "scheduled", token, panelText },
    effects: [...cancelIfScheduled(state), { type: "schedule", token }],
  };
}

export function ExercisePreviewPass_timerElapsed(
  state: IExercisePreviewPassState,
  token: number
): IExercisePreviewPassStep {
  if (state.phase !== "scheduled" || state.token !== token) {
    return { state, effects: [] };
  }
  return {
    state: { phase: "applying", token, panelText: state.panelText },
    effects: [{ type: "applyPreview", token, panelText: state.panelText }],
  };
}

export function ExercisePreviewPass_applied(
  state: IExercisePreviewPassState,
  token: number,
  result: IExercisePreviewPassApplyResult
): IExercisePreviewPassStep {
  if (state.phase !== "applying" || state.token !== token) {
    return { state, effects: [] };
  }
  if ("error" in result) {
    return { state: { phase: "failed", token, panelText: state.panelText, error: result.error }, effects: [], result };
  }
  return {
    state: { phase: "settled", token, panelText: state.panelText },
    effects: [{ type: "syncLine", blurb: result.blurb }],
    result,
  };
}

export function ExercisePreviewPass_flush(state: IExercisePreviewPassState): IExercisePreviewPassStep {
  if (state.phase === "scheduled") {
    return startApply(state, state.panelText);
  }
  if (state.phase === "failed") {
    return { state, effects: [], result: { error: state.error } };
  }
  return { state, effects: [] };
}

export function ExercisePreviewPass_materialized(
  state: IExercisePreviewPassState,
  panelText: string | undefined
): IExercisePreviewPassStep {
  if (panelText == null) {
    return ExercisePreviewPass_close(state);
  }
  if (state.phase !== "closed" && state.panelText === panelText) {
    return { state, effects: [] };
  }
  return { state: { phase: "settled", token: state.token, panelText }, effects: cancelIfScheduled(state) };
}

export function ExercisePreviewPass_close(state: IExercisePreviewPassState): IExercisePreviewPassStep {
  return { state: { phase: "closed", token: state.token }, effects: cancelIfScheduled(state) };
}
