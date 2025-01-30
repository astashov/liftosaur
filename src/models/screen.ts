import { IState } from "./state";
import { dequal } from "dequal";
import { Program } from "./program";
import { Progress } from "./progress";
import { ObjectUtils } from "../utils/object";

export type ITab = "home" | "program" | "workout" | "graphs" | "me";

export type IScreen =
  | "first"
  | "onboarding"
  | "main"
  | "settings"
  | "account"
  | "timers"
  | "plates"
  | "gyms"
  | "programs"
  | "progress"
  | "graphs"
  | "finishDay"
  | "muscles"
  | "stats"
  | "units"
  | "appleHealth"
  | "googleHealth"
  | "editProgram"
  | "editProgramExercise"
  | "editProgramDay"
  | "editProgramDayScript"
  | "editProgramWeek"
  | "measurements"
  | "subscription"
  | "exerciseStats"
  | "exercises"
  | "programPreview";

export namespace Screen {
  export const editProgramScreens: IScreen[] = [
    "editProgram",
    "editProgramDay",
    "editProgramWeek",
    "editProgramExercise",
    "editProgramDayScript",
  ];

  export function current(stack: IScreen[]): IScreen {
    return stack[stack.length - 1];
  }

  export function push(stack: IScreen[], screen: IScreen): IScreen[] {
    return [...stack, screen];
  }

  export function pull(stack: IScreen[]): IScreen[] {
    return stack.length > 1 ? [...stack].slice(0, stack.length - 1) : stack;
  }

  export function previous(stack: IScreen[]): IScreen | undefined {
    return stack[stack.length - 2];
  }

  export function enablePtr(stack: IScreen[]): boolean {
    const curr = Screen.current(stack);
    return ["first", "onboarding", "finishDay", "subscription", "programs", "measurements"].indexOf(curr) === -1;
  }

  export function shouldConfirmNavigation(state: IState): string | undefined {
    if (state.currentHistoryRecord) {
      const progress = state.progress[state.currentHistoryRecord];
      if (progress && !Progress.isCurrent(progress)) {
        const oldHistoryRecord = state.storage.history.find((hr) => hr.id === state.currentHistoryRecord);
        if (oldHistoryRecord != null && !dequal(oldHistoryRecord, progress)) {
          return "Are you sure? Changes won't be saved.";
        }
      }
    }

    const editExercise = state.editExercise;
    if (editExercise) {
      let editProgram = Program.getEditingProgram(state);
      editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
      const exercise = editProgram?.exercises.find((e) => e.id === editExercise.id);
      if (exercise == null || !dequal(editExercise, exercise)) {
        return "Are you sure? Your changes won't be saved";
      }
    }

    const editProgramV2 = state.editProgramV2;
    if (editProgramV2) {
      let editProgram = Program.getEditingProgram(state);
      editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
      if (editProgram?.planner && !ObjectUtils.isEqual(editProgram.planner, editProgramV2.current.program)) {
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
      case "onboarding": {
        return "program";
      }
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
      case "editProgramWeek": {
        return "program";
      }
      case "editProgramExercise": {
        return "program";
      }
      case "editProgramDay": {
        return "program";
      }
      case "editProgramDayScript": {
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
