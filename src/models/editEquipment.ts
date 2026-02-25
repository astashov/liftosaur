import { lb } from "lens-shmens";
import { IState, updateState } from "./state";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IEquipment, ISettings } from "../types";
import { Equipment_getEquipmentIdForExerciseType, Equipment_getEquipmentData } from "./equipment";
import { Exercise_toKey } from "./exercise";

export class EditEquipment {
  public static setEquipmentForExercise(
    exerciseType: IExerciseType,
    equipment: IEquipment | undefined,
    programExerciseIds: string[],
    dispatch: IDispatch,
    settings: ISettings,
    gymId?: string
  ): void {
    const exerciseKey = Exercise_toKey(exerciseType);
    const oldEquipment = Equipment_getEquipmentIdForExerciseType(settings, exerciseType);
    gymId = gymId ?? settings.currentGymId ?? settings.gyms[0].id;

    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("exerciseData")
          .recordModify((data) => {
            return {
              ...data,
              [exerciseKey]: {
                ...data[exerciseKey],
                equipment: { ...data[exerciseKey]?.equipment, [gymId]: equipment ? equipment : undefined },
              },
            };
          }),
      ],
      "Update equipment"
    );
    const currentUnit =
      (oldEquipment ? Equipment_getEquipmentData(settings, oldEquipment)?.unit : undefined) ?? settings.units;
    const newUnit = (equipment ? Equipment_getEquipmentData(settings, equipment)?.unit : undefined) ?? settings.units;
    if (currentUnit !== newUnit) {
      dispatch({
        type: "ApplyProgramChangesToProgress",
        programExerciseIds: programExerciseIds,
      });
    }
  }

  public static setDefaultRoundingForExercise(dispatch: IDispatch, exercise: IExerciseType, value: number): void {
    if (isNaN(value)) {
      return;
    }

    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("exerciseData")
          .recordModify((data) => {
            const k = Exercise_toKey(exercise);
            return { ...data, [k]: { ...data[k], rounding: Math.max(value, 0.1) } };
          }),
      ],
      "Update rounding"
    );
  }
}
