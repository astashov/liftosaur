import { IPlannerProgram } from "../../../types";
import { IPlannerUi } from "./types";

function structureOf(planner: IPlannerProgram | undefined): string {
  return JSON.stringify((planner?.weeks ?? []).map((week) => week.days.map((day) => day.name)));
}

export function PlannerUiClamp_apply(
  ui: IPlannerUi,
  oldPlanner: IPlannerProgram | undefined,
  newPlanner: IPlannerProgram | undefined
): IPlannerUi {
  if (structureOf(oldPlanner) === structureOf(newPlanner)) {
    return ui;
  }
  const lastWeekIndex = Math.max(0, (newPlanner?.weeks.length ?? 1) - 1);
  return {
    ...ui,
    weekIndex: Math.min(Math.max(0, ui.weekIndex), lastWeekIndex),
    focusedExercise: undefined,
    dayUi: { collapsed: new Set() },
  };
}
