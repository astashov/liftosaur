import { IScreenMusclePointsColl, Muscle } from "../../../models/muscle";
import { BuilderExerciseModel } from "./builderExerciseModel";
import { IBuilderDay, IBuilderSet } from "./types";
import { IExerciseType } from "../../../types";
import { Exercise } from "../../../models/exercise";

export class BuilderDayModel {
  public static build(name: string): IBuilderDay {
    return {
      name: name,
      exercises: [BuilderExerciseModel.build()],
    };
  }

  public static approxTimeMs(day: IBuilderDay): number {
    return day.exercises.reduce((memo, exercise) => {
      return (
        memo +
        exercise.sets.reduce((memo2, set) => {
          return memo2 + this.approxSetTimeMs(set, exercise.isSuperset ? 30 : exercise.restTimer);
        }, 0)
      );
    }, 0);
  }

  public static approxSetTimeMs(set: IBuilderSet, restTime: number): number {
    const secondsPerRep = 7;
    const prepareTime = 20;
    const timeToRep = (prepareTime + set.reps * secondsPerRep) * 1000;
    const timeToRest = restTime * 1000;
    const totalTime = timeToRep + timeToRest;
    return totalTime;
  }

  public static calories(timeMs: number): [number, number] {
    const minutes = Math.floor(timeMs / 60000);
    return [minutes * 4, minutes * 8];
  }

  public static getScreenMusclePointsForDay(day: IBuilderDay, exerciseType?: IExerciseType): IScreenMusclePointsColl {
    return day.exercises.reduce<IScreenMusclePointsColl>((memo, exercise) => {
      if (exerciseType != null && !Exercise.eq(exercise.exerciseType, exerciseType)) {
        return memo;
      }
      return Muscle.mergeScreenMusclePoints(memo, BuilderExerciseModel.getScreenMusclePointsForExercise(exercise));
    }, Muscle.getEmptyScreenMusclesPoints());
  }
}
