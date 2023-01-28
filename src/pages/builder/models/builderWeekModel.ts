import { BuilderDayModel } from "./builderDayModel";
import { IBuilderWeek } from "./types";
import { IExerciseType, IUnit, IWeight } from "../../../types";
import { Weight } from "../../../models/weight";
import { Exercise } from "../../../models/exercise";
import { IScreenMusclePointsColl, Muscle } from "../../../models/muscle";

export interface IVolumeSplit {
  rmLess60: number;
  rm60: number;
  rm75: number;
  rm85: number;
}

export class BuilderWeekModel {
  public static build(name: string): IBuilderWeek {
    return {
      name: name,
      days: [BuilderDayModel.build("Day 1")],
    };
  }

  public static calculateIntensity(week: IBuilderWeek, exerciseType: IExerciseType, unit: IUnit): IWeight {
    return week.days.reduce((memo, day) => {
      return Weight.add(
        memo,
        day.exercises.reduce((memo2, exercise) => {
          if (Exercise.eq(exercise.exerciseType, exerciseType)) {
            return Weight.add(
              memo2,
              exercise.sets.reduce((memo3, set) => {
                const weight = Weight.multiply(exercise.onerm, (set.weightPercentage * set.reps) / 100);
                return Weight.add(weight, memo3);
              }, Weight.build(0, unit))
            );
          } else {
            return memo2;
          }
        }, Weight.build(0, unit))
      );
    }, Weight.build(0, unit));
  }

  public static calculateVolumeSplit(week: IBuilderWeek, exerciseType: IExerciseType): IVolumeSplit {
    const volumeSplit = this.emptyVolumeSplit();
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        if (Exercise.eq(exercise.exerciseType, exerciseType)) {
          for (const set of exercise.sets) {
            if (set.weightPercentage < 60) {
              volumeSplit.rmLess60 += set.reps;
            } else if (set.weightPercentage < 75) {
              volumeSplit.rm60 += set.reps;
            } else if (set.weightPercentage < 85) {
              volumeSplit.rm75 += set.reps;
            } else {
              volumeSplit.rm85 += set.reps;
            }
          }
        }
      }
    }
    return volumeSplit;
  }

  public static emptyVolumeSplit(): IVolumeSplit {
    return {
      rmLess60: 0,
      rm60: 0,
      rm75: 0,
      rm85: 0,
    };
  }

  public static getScreenMusclePointsForWeek(
    week: IBuilderWeek,
    exerciseType?: IExerciseType
  ): IScreenMusclePointsColl {
    return week.days.reduce<IScreenMusclePointsColl>((memo, day) => {
      return Muscle.mergeScreenMusclePoints(memo, BuilderDayModel.getScreenMusclePointsForDay(day, exerciseType));
    }, Muscle.getEmptyScreenMusclesPoints());
  }
}
