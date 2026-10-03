import { IPlannerProgramWeek, ISettings } from "../../../types";
import { IEither } from "../../../utils/types";
import { IPlannerEvalFullResult, IPlannerEvalResult, PlannerSyntaxError } from "../plannerExerciseEvaluator";
import {
  PlannerProgram_evaluateFull,
  PlannerProgram_generateFullText,
  PlannerProgram_parseText,
} from "./plannerProgram";
import { IPlannerEditMode, IPlannerFullText, IPlannerState, IPlannerUi } from "./types";

export type IPlannerWebMode = "grid" | "perday" | "full";

export interface IPlannerFullTextCommit {
  weeks?: IPlannerProgramWeek[];
  error?: PlannerSyntaxError;
}

export function PlannerMode_current(ui: IPlannerUi): IPlannerWebMode {
  return ui.mode === "grid" || ui.mode === "full" ? ui.mode : "perday";
}

export function PlannerMode_canSwitch(evaluatedWeeks: IPlannerEvalResult[][], to: IPlannerEditMode): boolean {
  if (to !== "grid") {
    return true;
  }
  return evaluatedWeeks.every((week) => week.every((day) => day.success));
}

export function PlannerMode_isValid(
  evaluatedWeeks: IPlannerEvalResult[][],
  fullEvaluation?: IPlannerEvalFullResult
): boolean {
  return fullEvaluation != null ? fullEvaluation.success : PlannerMode_canSwitch(evaluatedWeeks, "grid");
}

export function PlannerMode_isStructureError(error: PlannerSyntaxError | undefined): boolean {
  return error?.details.type === "dayWithoutWeek" || error?.details.type === "exerciseWithoutDay";
}

export function PlannerMode_switch(
  state: IPlannerState,
  to: IPlannerWebMode
): IEither<Pick<IPlannerState, "ui" | "fulltext">, PlannerSyntaxError> {
  const from = PlannerMode_current(state.ui);
  if (from === to) {
    return { success: true, data: { ui: state.ui, fulltext: state.fulltext } };
  }
  if (from === "full" && state.fulltext != null) {
    const parsed = PlannerProgram_parseText(state.fulltext.text);
    if (!parsed.success) {
      return parsed;
    }
  }
  const ui: IPlannerUi = { ...state.ui, mode: to };
  if (to === "full") {
    const weeks = state.current.program.planner?.weeks ?? [];
    return { success: true, data: { ui, fulltext: { text: PlannerProgram_generateFullText(weeks) } } };
  }
  return { success: true, data: { ui, fulltext: undefined } };
}

export function PlannerMode_commitFullText(text: string, settings: ISettings): IPlannerFullTextCommit {
  const parsed = PlannerProgram_parseText(text);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const evaluated = PlannerProgram_evaluateFull(text, settings).evaluatedWeeks;
  return { weeks: parsed.data, error: evaluated.success ? undefined : evaluated.error };
}

export function PlannerMode_applyFullText(state: IPlannerState, text: string): IPlannerState {
  const fulltext = { ...state.fulltext, text };
  const planner = state.current.program.planner;
  const parsed = PlannerProgram_parseText(text);
  if (!parsed.success || planner == null) {
    return { ...state, fulltext };
  }
  const program = { ...state.current.program, planner: { ...planner, weeks: parsed.data } };
  return { ...state, fulltext, current: { ...state.current, program } };
}

export function PlannerMode_fullTextAfter(
  oldState: IPlannerState,
  newState: IPlannerState
): IPlannerFullText | undefined {
  const planner = newState.current.program.planner;
  if (
    PlannerMode_current(newState.ui) !== "full" ||
    newState.fulltext == null ||
    newState.fulltext !== oldState.fulltext ||
    planner == null ||
    planner === oldState.current.program.planner
  ) {
    return undefined;
  }
  const text = PlannerProgram_generateFullText(planner.weeks);
  return text === newState.fulltext.text ? undefined : { ...newState.fulltext, text };
}
