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
    const targetScreenMuscles = targetMuscles.reduce<Set<IScreenMuscle>>((memo, muscle) => {
      for (const m of Muscle.getScreenMusclesFromMuscle(muscle)) {
        memo.add(m);
      }
      return memo;
    }, new Set());
    const synergistMuscles = Exercise.synergistMuscles(exercise.exerciseType, {});
    const synergistScreenMuscles = synergistMuscles.reduce<Set<IScreenMuscle>>((memo, muscle) => {
      for (const m of Muscle.getScreenMusclesFromMuscle(muscle)) {
        memo.add(m);
      }
      return memo;
    }, new Set());

    const points: Partial<Record<IScreenMuscle, number>> = Muscle.getEmptyScreenMusclesPoints();

    for (const set of exercise.sets) {
      let completedRepsForWeight;
      if (set.weightPercentage > 98) {
        completedRepsForWeight = 100 - set.weightPercentage + 4; // 95/15,99/3
      } else if (set.weightPercentage > 95) {
        completedRepsForWeight = 300 - 3 * set.weightPercentage; // 95/15,99/3
      } else if (set.weightPercentage > 85) {
        completedRepsForWeight = 442 - 4.5 * set.weightPercentage; // 85/60,95/15
      } else if (set.weightPercentage > 75) {
        completedRepsForWeight = 570 - 6 * set.weightPercentage; // 85/60,75/120
      } else if (set.weightPercentage > 60) {
        completedRepsForWeight = 930 - 11 * set.weightPercentage; // 75/120,60/270
      } else {
        completedRepsForWeight = 1600 - 22 * set.weightPercentage;
      }
      const completeness = set.reps / completedRepsForWeight;
      for (const screenMuscle of targetScreenMuscles) {
        points[screenMuscle] = points[screenMuscle] || 0;
        points[screenMuscle]! += completeness;
      }
      for (const screenMuscle of synergistScreenMuscles) {
        points[screenMuscle] = points[screenMuscle] || 0;
        points[screenMuscle]! += completeness * 0.3;
      }
    }
    return points;
  }
}
