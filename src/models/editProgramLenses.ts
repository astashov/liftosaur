import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { IExerciseType, IPercentage, IProgramExercise, IProgramState, ISettings, IWeight } from "../types";
import { ObjectUtils_entries } from "../utils/object";
import { Exercise_get } from "./exercise";
import { Weight_is, Weight_build, Weight_isPct, Weight_buildPct } from "./weight";
import { IPlannerProgramExercise } from "../pages/planner/models/types";

export function EditProgramLenses_changeExercise<T>(
  prefix: LensBuilder<T, IProgramExercise, {}>,
  settings: ISettings,
  oldExerciseType: IExerciseType,
  newExerciseType: IExerciseType
): ILensRecordingPayload<T>[] {
  const oldExercise = Exercise_get(oldExerciseType, settings.exercises);
  const exercise = Exercise_get(newExerciseType, settings.exercises);
  return [
    prefix.p("exerciseType").p("id").record(exercise.id),
    prefix.p("exerciseType").p("equipment").record(exercise.equipment),
    prefix.p("state").recordModify((oldState) => {
      if ("weight" in oldState) {
        return {
          ...oldState,
          weight: settings.units === "kg" ? exercise.startingWeightKg : exercise.startingWeightLb,
        };
      } else {
        return oldState;
      }
    }),
    prefix.p("name").recordModify((oldName) => {
      if (oldExercise != null) {
        return oldName.replace(oldExercise.name, exercise.name);
      } else {
        return exercise.name;
      }
    }),
  ];
}

function editStateVariable<T>(
  prefix: LensBuilder<T, IPlannerProgramExercise, {}>,
  stateKey: string,
  newValue?: string | number | IWeight | IPercentage
): ILensRecordingPayload<T> {
  return prefix
    .pi("progress")
    .p("state")
    .recordModify((state) => {
      if (newValue == null || typeof newValue === "string") {
        return updateStateVariable(state, stateKey, newValue);
      } else {
        return { ...state, [stateKey]: newValue };
      }
    });
}

function removeStateVariableMetadata<T>(
  prefix: LensBuilder<T, IPlannerProgramExercise, {}>,
  stateKey: string
): ILensRecordingPayload<T> {
  return prefix
    .pi("progress")
    .p("stateMetadata")
    .recordModify((state) => {
      const newState = { ...state };
      delete newState[stateKey];
      return newState;
    });
}

export function EditProgramLenses_properlyUpdateStateVariable<T>(
  prefix: LensBuilder<T, IPlannerProgramExercise, {}>,
  values: Partial<IProgramState>
): ILensRecordingPayload<T>[] {
  return ObjectUtils_entries(values).flatMap(([stateKey, newValue]) => {
    if (newValue == null) {
      return [removeStateVariableMetadata(prefix, stateKey), editStateVariable(prefix, stateKey, newValue)];
    } else {
      return [editStateVariable(prefix, stateKey, newValue)];
    }
  });
}

export function updateStateVariable(state: IProgramState, stateKey: string, newValue?: string): IProgramState {
  if (newValue === "") {
    newValue = "0";
  }
  let v = newValue != null && newValue !== "" ? parseFloat(newValue) : null;
  if (v != null && isNaN(v)) {
    v = 0;
  }
  const newState = { ...state };
  const value = state[stateKey];
  if (Weight_is(value) && v != null && v < 0) {
    v = 0;
  }
  if (v != null) {
    newState[stateKey] = Weight_is(value)
      ? Weight_build(v || 0, value.unit)
      : Weight_isPct(value)
        ? Weight_buildPct(v)
        : v;
  } else {
    delete newState[stateKey];
  }
  return newState;
}
