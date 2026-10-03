import { Exercise_createCustomExercise } from "../../../models/exercise";
import { IPlannerUi } from "./types";

export function PlannerCustomExerciseCta_open(ui: IPlannerUi, name: string): IPlannerUi {
  return {
    ...ui,
    exercisePicker: {
      state: {
        mode: "program",
        screenStack: ["customExercise"],
        sort: "name_asc",
        filters: {},
        selectedExercises: [],
        editCustomExercise: Exercise_createCustomExercise(name, [], [], []),
        hideLabel: true,
      },
      dayData: { week: 1, dayInWeek: 1 },
      change: "all",
    },
  };
}
