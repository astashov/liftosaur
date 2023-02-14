/* eslint-disable @typescript-eslint/ban-types */
import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { IProgram } from "../types";

export namespace EditProgramLenses {
  export function reorderDays<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    startDayIndex: number,
    endDayIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("days").recordModify((days) => {
      const newDays = [...days];
      const [daysToMove] = newDays.splice(startDayIndex, 1);
      newDays.splice(endDayIndex, 0, daysToMove);
      return newDays;
    });
  }

  export function reorderExercises<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    dayIndex: number,
    startExerciseIndex: number,
    endExceciseIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("days")
      .i(dayIndex)
      .p("exercises")
      .recordModify((exercises) => {
        const newExercises = [...exercises];
        const [exercisesToMove] = newExercises.splice(startExerciseIndex, 1);
        newExercises.splice(endExceciseIndex, 0, exercisesToMove);
        return newExercises;
      });
  }
}
