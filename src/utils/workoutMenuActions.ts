export type IWorkoutMenuAction = "editDay" | "muscles" | "notes" | "share" | "createProgramDay" | "tour" | "delete";

export interface IWorkoutMenuActionsArgs {
  isCurrent: boolean;
  hasNonEmptyProgram: boolean;
  hasNonEmptyCurrentProgram: boolean;
  isInAnyProgram: boolean;
}

export function WorkoutMenuActions_list(args: IWorkoutMenuActionsArgs): IWorkoutMenuAction[] {
  const actions: IWorkoutMenuAction[] = [];
  if (args.hasNonEmptyProgram && args.hasNonEmptyCurrentProgram) {
    actions.push("editDay");
  }
  if (args.hasNonEmptyProgram) {
    actions.push("muscles");
  }
  actions.push("notes");
  if (!args.isCurrent) {
    actions.push("share");
  }
  if (!args.isCurrent && !args.isInAnyProgram) {
    actions.push("createProgramDay");
  }
  actions.push("tour");
  actions.push("delete");
  return actions;
}
