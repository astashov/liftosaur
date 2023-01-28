import { Exercise } from "../../../models/exercise";
import { IScreenMuscle, IScreenMusclePointsColl, Muscle } from "../../../models/muscle";
import { Weight } from "../../../models/weight";
import { IBuilderExercise } from "./types";
import { IExerciseType } from "../../../types";

export class BuilderExerciseModel {
  public static build(exerciseType?: IExerciseType): IBuilderExercise {
    return {
      exerciseType: exerciseType || { id: "squat", equipment: "barbell" },
      sets: [{ reps: 5, weightPercentage: 70 }],
      isSuperset: false,
      restTimer: 180,
      onerm: Weight.build(45, "lb"),
    };
  }

  public static getScreenMusclePointsForExercise(exercise: IBuilderExercise): IScreenMusclePointsColl {
    const targetMuscles = Exercise.targetMuscles(exercise.exerciseType, {});
    const synergistMuscles = Exercise.synergistMuscles(exercise.exerciseType, {});

    const points: Partial<Record<IScreenMuscle, number>> = Muscle.getEmptyScreenMusclesPoints();

    for (const set of exercise.sets) {
      const completedRepsForWeight = Math.exp(-0.031 * (set.weightPercentage - 200)) * 2.7 - 52;
      const completeness = set.reps / completedRepsForWeight;
      for (const muscle of targetMuscles) {
        const screenMuscles = Muscle.getScreenMusclesFromMuscle(muscle);
        for (const screenMuscle of screenMuscles) {
          points[screenMuscle] = points[screenMuscle] || 0;
          points[screenMuscle]! += completeness;
        }
      }
      for (const muscle of synergistMuscles) {
        const screenMuscles = Muscle.getScreenMusclesFromMuscle(muscle);
        for (const screenMuscle of screenMuscles) {
          points[screenMuscle] = points[screenMuscle] || 0;
          points[screenMuscle]! += completeness * 0.3;
        }
      }
    }
    return points;
  }
}
