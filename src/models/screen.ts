import { IState } from "./state";
import { dequal } from "dequal";
import { Progress_isCurrent } from "./progress";
import { IDayData, IStatsKey } from "../types";
import { Program_getProgram, Program_cleanPlannerProgram } from "./program";
import { ObjectUtils_isEqual } from "../utils/object";

export type ITab = "home" | "program" | "workout" | "graphs" | "me";

export type IScreenData =
  | { name: "first"; params?: Record<string, never> }
  | { name: "main"; params?: { historyRecordId?: number } }
  | { name: "settings"; params?: Record<string, never> }
  | { name: "account"; params?: Record<string, never> }
  | { name: "timers"; params?: Record<string, never> }
  | { name: "plates"; params?: Record<string, never> }
  | { name: "gyms"; params?: Record<string, never> }
  | { name: "programs"; params?: Record<string, never> }
  | { name: "progress"; params?: { id?: number } }
  | { name: "graphs"; params?: Record<string, never> }
  | { name: "finishDay"; params?: Record<string, never> }
  | { name: "muscles"; params?: Record<string, never> }
  | { name: "muscleGroups"; params?: Record<string, never> }
  | { name: "stats"; params?: Record<string, never> }
  | { name: "units"; params?: Record<string, never> }
  | { name: "appleHealth"; params?: Record<string, never> }
  | { name: "googleHealth"; params?: Record<string, never> }
  | { name: "editProgram"; params: { programId: string } }
  | { name: "editProgramExercise"; params: { programId: string; key: string; dayData: Required<IDayData> } }
  | { name: "measurements"; params?: { key: IStatsKey } }
  | { name: "subscription"; params?: Record<string, never> }
  | { name: "exerciseStats"; params?: Record<string, never> }
  | { name: "exercises"; params?: Record<string, never> }
  | { name: "onerms"; params?: Record<string, never> }
  | { name: "setupequipment"; params?: Record<string, never> }
  | { name: "setupplates"; params?: Record<string, never> }
  | { name: "programselect"; params?: Record<string, never> }
  | { name: "programPreview"; params?: Record<string, never> }
  | { name: "apiKeys"; params?: Record<string, never> }
  | { name: "onboarding/programselect"; params?: Record<string, never> }
  | { name: "onboarding/programs"; params?: Record<string, never> }
  | { name: "onboarding/programPreview"; params?: Record<string, never> }
  | { name: "me/programs"; params?: Record<string, never> }
  | { name: "workout/editProgramExercise"; params: { programId: string; key: string; dayData: Required<IDayData> } };

export type IScreen = IScreenData["name"];
export type IScreenParams<T extends IScreen> = Extract<IScreenData, { name: T }>["params"];

export function Screen_shouldConfirmNavigation(state: IState, currentScreen: IScreenData): string | undefined {
  const progressId = currentScreen.name === "progress" ? (currentScreen.params?.id ?? 0) : 0;
  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  if (progress && !Progress_isCurrent(progress)) {
    const oldHistoryRecord = state.storage.history.find((hr) => hr.id === progress.id);
    const { ui: _ui, ...progressWithoutUi } = progress;
    if (oldHistoryRecord != null && !dequal(oldHistoryRecord, progressWithoutUi)) {
      return "Are you sure? Changes won't be saved.";
    }
  }

  if (currentScreen.name === "editProgram") {
    const programId = currentScreen.params?.programId;
    const editProgramState = programId ? state.editProgramStates[programId] : undefined;
    if (editProgramState) {
      const currentProgram = Program_getProgram(state, editProgramState.current.program.id);
      if (currentProgram != null && currentProgram.planner && editProgramState.current.program.planner) {
        const oldCleanedProgram = Program_cleanPlannerProgram(currentProgram);
        const newCleanedProgram = Program_cleanPlannerProgram(editProgramState.current.program);
        if (!ObjectUtils_isEqual(oldCleanedProgram.planner!, newCleanedProgram.planner!)) {
          return "Are you sure? Your program changes won't be saved.";
        }
      }
    }
  }

  if (currentScreen.name === "editProgramExercise" || currentScreen.name === "workout/editProgramExercise") {
    const exerciseKey = currentScreen.params?.key;
    const exerciseProgramId = currentScreen.params?.programId;
    const exerciseStateKey = exerciseProgramId && exerciseKey ? `${exerciseProgramId}_${exerciseKey}` : undefined;
    const editProgramExerciseState = exerciseStateKey ? state.editProgramExerciseStates[exerciseStateKey] : undefined;
    if (editProgramExerciseState) {
      const programId = currentScreen.params?.programId;
      const editProgramState = programId ? state.editProgramStates[programId] : undefined;
      if (
        editProgramState &&
        editProgramState.current.program.planner &&
        editProgramExerciseState.current.program.planner
      ) {
        if (
          !ObjectUtils_isEqual(
            editProgramExerciseState.current.program.planner,
            editProgramState.current.program.planner
          )
        ) {
          return "Are you sure? Your program exercise changes won't be saved.";
        }
      } else {
        const currentProgram = Program_getProgram(state, editProgramExerciseState.current.program.id);
        if (currentProgram != null && currentProgram.planner && editProgramExerciseState.current.program.planner) {
          if (!ObjectUtils_isEqual(currentProgram.planner, editProgramExerciseState.current.program.planner)) {
            return "Are you sure? Your program exercise changes won't be saved.";
          }
        }
      }
    }
  }

  return undefined;
}

export function Screen_isSameTab(prev: IScreen, next: IScreen): boolean {
  return Screen_tab(prev) === Screen_tab(next);
}

export function Screen_tab(screen: IScreen): ITab {
  switch (screen) {
    case "main": {
      return "home";
    }
    case "settings": {
      return "me";
    }
    case "account": {
      return "me";
    }
    case "timers": {
      return "me";
    }
    case "plates": {
      return "me";
    }
    case "appleHealth": {
      return "me";
    }
    case "googleHealth": {
      return "me";
    }
    case "gyms": {
      return "me";
    }
    case "exercises": {
      return "me";
    }
    case "programs": {
      return "program";
    }
    case "progress": {
      return "workout";
    }
    case "graphs": {
      return "graphs";
    }
    case "finishDay": {
      return "workout";
    }
    case "muscles": {
      return "workout";
    }
    case "muscleGroups": {
      return "me";
    }
    case "stats": {
      return "me";
    }
    case "editProgram": {
      return "program";
    }
    case "editProgramExercise": {
      return "program";
    }
    case "measurements": {
      return "me";
    }
    case "subscription": {
      return "workout";
    }
    case "exerciseStats": {
      return "me";
    }
    case "programPreview": {
      return "program";
    }
    case "first": {
      return "program";
    }
    case "onerms": {
      return "program";
    }
    case "setupequipment": {
      return "program";
    }
    case "setupplates": {
      return "program";
    }
    case "programselect": {
      return "program";
    }
    case "units": {
      return "program";
    }
    case "apiKeys": {
      return "me";
    }
    case "onboarding/programselect":
    case "onboarding/programs":
    case "onboarding/programPreview": {
      return "program";
    }
    case "me/programs": {
      return "me";
    }
    case "workout/editProgramExercise": {
      return "workout";
    }
  }
}
