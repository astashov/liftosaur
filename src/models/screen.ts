export type IScreen =
  | "main"
  | "settings"
  | "account"
  | "timers"
  | "plates"
  | "programSettings"
  | "programs"
  | "progress"
  | "graphs"
  | "editProgram"
  | "editProgramDay"
  | "editProgramDayScript";

export namespace Screen {
  export const editProgramScreens: IScreen[] = ["editProgram", "editProgramDay", "editProgramDayScript"];

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
}
