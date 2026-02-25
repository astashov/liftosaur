import { IState } from "./state";
import { dequal } from "dequal";
import { Progress_getProgress, Progress_isCurrent } from "./progress";
import { IDayData, IStatsKey } from "../types";
import { IPlannerExerciseState, IPlannerState } from "../pages/planner/models/types";
import { Program_getProgram, Program_cleanPlannerProgram } from "./program";
import { ObjectUtils_isEqual } from "../utils/object";
import { CollectionUtils_findBy } from "../utils/collection";

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
  | { name: "editProgram"; params?: { plannerState: IPlannerState } }
  | {
      name: "editProgramExercise";
      params?: { key: string; dayData: Required<IDayData>; plannerState: IPlannerExerciseState };
    }
  | { name: "measurements"; params?: { key: IStatsKey } }
  | { name: "subscription"; params?: Record<string, never> }
  | { name: "exerciseStats"; params?: Record<string, never> }
  | { name: "exercises"; params?: Record<string, never> }
  | { name: "onerms"; params?: Record<string, never> }
  | { name: "setupequipment"; params?: Record<string, never> }
  | { name: "programPreview"; params?: Record<string, never> };

export type IScreen = IScreenData["name"];
export type IScreenStack = IScreenData[];
export type IScreenParams<T extends IScreen> = Extract<IScreenData, { name: T }>["params"];

export function Screen_currentName(stack: IScreenStack): IScreen {
  return stack[stack.length - 1].name;
}

export function Screen_current(stack: IScreenStack): IScreenData {
  return stack[stack.length - 1];
}

export function Screen_push<T extends IScreenData["name"]>(
  stack: IScreenStack,
  name: T,
  params?: IScreenParams<T>
): IScreenStack {
  const newEntry: IScreenData = { name, ...(params ? { params } : {}) } as Extract<IScreenData, { name: T }>;
  return [...stack, newEntry];
}

export function Screen_updateParams<T extends IScreen>(stack: IScreenStack, params?: IScreenParams<T>): IScreenStack {
  const topStack = stack[stack.length - 1];
  const newTopStack = { ...topStack, params };
  return [...stack.slice(0, stack.length - 1), newTopStack] as IScreenStack;
}

export function Screen_pull(stack: IScreenStack): IScreenStack {
  return stack.length > 1 ? [...stack].slice(0, stack.length - 1) : stack;
}

export function Screen_previous(stack: IScreenStack): IScreen | undefined {
  return stack[stack.length - 2]?.name;
}

export function Screen_enablePtr(stack: IScreenStack): boolean {
  const curr = Screen_currentName(stack);
  return ["first", "finishDay", "subscription", "programs", "measurements"].indexOf(curr) === -1;
}

export function Screen_shouldConfirmNavigation(state: IState, isPush: boolean): string | undefined {
  const progress = Progress_getProgress(state);
  if (progress && !Progress_isCurrent(progress)) {
    const oldHistoryRecord = state.storage.history.find((hr) => hr.id === progress.id);
    if (oldHistoryRecord != null && !dequal(oldHistoryRecord, progress)) {
      return "Are you sure? Changes won't be saved.";
    }
  }

  const currentScreen = Screen_current(state.screenStack);
  const screens = isPush ? [...state.screenStack].reverse() : [currentScreen];
  for (const screen of screens) {
    if (screen.name === "editProgram") {
      const editProgramState = screen.params?.plannerState;
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
  }

  if (currentScreen.name === "editProgramExercise") {
    const editProgramExerciseState = currentScreen.params?.plannerState;
    if (editProgramExerciseState) {
      const editProgramScreen = CollectionUtils_findBy(state.screenStack, "name", "editProgram");
      if (editProgramScreen != null && editProgramScreen.name === "editProgram") {
        const editProgramState = editProgramScreen.params?.plannerState;
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
      return "program";
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
    case "units": {
      return "program";
    }
  }
}
