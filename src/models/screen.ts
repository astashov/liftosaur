export type ITab = "program" | "measurements" | "workout" | "graphs" | "settings";

export type IScreen =
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
    return [...stack].slice(0, stack.length - 1);
  }

  export function previous(stack: IScreen[]): IScreen | undefined {
    return stack[stack.length - 2];
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
    }
  }
}
