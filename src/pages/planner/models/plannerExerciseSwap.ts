import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_getNumberOfExerciseInstances,
  Program_getProgramExerciseForKeyAndShortDayData,
} from "../../../models/program";
import { pickerStateFromPlannerExercise } from "../../../components/editProgram/editProgramUtils";
import { ISettings, IShortDayData } from "../../../types";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "./types";

export function PlannerExerciseSwap_open(
  ui: IPlannerUi,
  evaluatedProgram: IEvaluatedProgram,
  settings: ISettings,
  plannerExercise: IPlannerProgramExercise,
  dayData: IShortDayData
): IPlannerUi {
  if (Program_getNumberOfExerciseInstances(evaluatedProgram, plannerExercise.key) > 1) {
    return { ...ui, editExerciseModal: { plannerExercise } };
  }
  return {
    ...ui,
    exercisePicker: {
      state: { ...pickerStateFromPlannerExercise(settings, plannerExercise), hideLabel: true },
      dayData,
      exerciseKey: plannerExercise.key,
      change: "one",
    },
  };
}

export function PlannerExerciseSwap_openByKey(
  state: IPlannerState,
  settings: ISettings,
  dayData: IShortDayData,
  exerciseKey: string
): IPlannerState {
  const evaluatedProgram = Program_evaluate(state.current.program, settings);
  const plannerExercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, exerciseKey);
  if (plannerExercise == null) {
    return state;
  }
  return { ...state, ui: PlannerExerciseSwap_open(state.ui, evaluatedProgram, settings, plannerExercise, dayData) };
}
