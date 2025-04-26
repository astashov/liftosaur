/* eslint-disable @typescript-eslint/ban-types */
import { IState } from "./state";
import { dequal } from "dequal";
import { Program } from "./program";
import { Progress } from "./progress";
import { ObjectUtils } from "../utils/object";
import { IStatsKey } from "../types";

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
  | { name: "stats"; params?: Record<string, never> }
  | { name: "units"; params?: Record<string, never> }
  | { name: "appleHealth"; params?: Record<string, never> }
  | { name: "googleHealth"; params?: Record<string, never> }
  | { name: "editProgram"; params?: Record<string, never> }
  | { name: "measurements"; params?: { key: IStatsKey } }
  | { name: "subscription"; params?: Record<string, never> }
  | { name: "exerciseStats"; params?: Record<string, never> }
  | { name: "exercises"; params?: Record<string, never> }
  | { name: "programPreview"; params?: Record<string, never> };

export type IScreen = IScreenData["name"];
export type IScreenStack = IScreenData[];
export type IScreenParams<T extends IScreen> = Extract<IScreenData, { name: T }>["params"];

export namespace Screen {
  export const editProgramScreens: IScreen[] = ["editProgram"];

  export function currentName(stack: IScreenStack): IScreen {
    return stack[stack.length - 1].name;
  }

  export function current(stack: IScreenStack): IScreenData {
    return stack[stack.length - 1];
  }

  export function push<T extends IScreenData["name"]>(
    stack: IScreenStack,
    name: T,
    params?: IScreenParams<T>
  ): IScreenStack {
    const newEntry: IScreenData = { name, ...(params ? { params } : {}) } as Extract<IScreenData, { name: T }>;
    return [...stack, newEntry];
  }

  export function updateParams<T extends IScreen>(stack: IScreenStack, params?: IScreenParams<T>): IScreenStack {
    const topStack = stack[stack.length - 1];
    const newTopStack = { ...topStack, params };
    return [...stack.slice(0, stack.length - 1), newTopStack] as IScreenStack;
  }

  export function pull(stack: IScreenStack): IScreenStack {
    return stack.length > 1 ? [...stack].slice(0, stack.length - 1) : stack;
  }

  export function previous(stack: IScreenStack): IScreen | undefined {
    return stack[stack.length - 2]?.name;
  }

  export function enablePtr(stack: IScreenStack): boolean {
    const curr = Screen.currentName(stack);
    return ["first", "finishDay", "subscription", "programs", "measurements"].indexOf(curr) === -1;
  }

  export function shouldConfirmNavigation(state: IState): string | undefined {
    const progress = Progress.getProgress(state);
    if (progress && !Progress.isCurrent(progress)) {
      const oldHistoryRecord = state.storage.history.find((hr) => hr.id === progress.id);
      if (oldHistoryRecord != null && !dequal(oldHistoryRecord, progress)) {
        return "Are you sure? Changes won't be saved.";
      }
    }

    const editProgramV2 = state.editProgramV2;
    if (editProgramV2) {
      let editProgram = Program.getEditingProgram(state);
      editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
      if (editProgram?.planner && !ObjectUtils.isEqual(editProgram.planner, editProgramV2.current.program.planner!)) {
        return "Are you sure? Your changes won't be saved";
      }
    }

    return undefined;
  }

  export function isSameTab(prev: IScreen, next: IScreen): boolean {
    return tab(prev) === tab(next);
  }

  export function tab(screen: IScreen): ITab {
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
      case "stats": {
        return "me";
      }
      case "editProgram": {
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
      case "units": {
        return "program";
      }
    }
  }
}
