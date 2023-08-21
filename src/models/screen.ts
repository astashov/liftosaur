import { IState } from "./state";
import { dequal } from "dequal";
import { Program } from "./program";
import { Progress } from "./progress";

export type ITab = "program" | "measurements" | "workout" | "graphs" | "settings";

export type IScreen =
  | "first"
  | "onboarding"
  | "main"
  | "settings"
  | "account"
  | "timers"
  | "plates"
  | "programs"
  | "progress"
  | "graphs"
  | "finishDay"
  | "musclesProgram"
  | "musclesDay"
  | "stats"
  | "editProgram"
  | "editProgramExercise"
  | "editProgramDay"
  | "editProgramDayScript"
  | "editProgramWeek"
  | "friends"
  | "friendsAdd"
  | "measurements"
  | "subscription"
  | "exerciseStats"
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

    return undefined;
  }

  export function tab(screen: IScreen): ITab {
    switch (screen) {
      case "onboarding": {
        return "program";
      }
      case "main": {
        return "workout";
      }
      case "settings": {
        return "settings";
      }
      case "account": {
        return "settings";
      }
      case "timers": {
        return "settings";
      }
      case "plates": {
        return "settings";
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
      case "musclesProgram": {
        return "program";
      }
      case "musclesDay": {
        return "program";
      }
      case "stats": {
        return "measurements";
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
      case "friends": {
        return "settings";
      }
      case "friendsAdd": {
        return "settings";
      }
      case "measurements": {
        return "measurements";
      }
      case "subscription": {
        return "workout";
      }
      case "exerciseStats": {
        return "workout";
      }
      case "programPreview": {
        return "program";
      }
      case "first": {
        return "program";
      }
    }
  }
}
