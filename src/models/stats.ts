import { IExcerciseType } from "./excercise";
import { IWeight } from "./weight";
import { IProgress, Progress } from "./progress";
import { IProgram } from "./program";
import { Reps, ISet } from "./set";

export interface IStats {
  excercises: IStatsExcercises;
}

type IStatsExcercises = { [P in IExcerciseType]?: IStatsExcercisesValue };

interface IStatsExcercisesValue {
  weights: {
    [key: string]: IWeight | undefined;
  };
}

export namespace Stats {
  export function update(stats: IStats, program: IProgram, progress: IProgress): IStats {
    const excercises = progress.entries.map(e => e.excercise);
    return {
      ...stats,
      excercises: {
        ...(stats.excercises || {}),
        ...excercises.reduce<IStatsExcercises>((memo, excercise) => {
          const progressEntry = Progress.findEntryByExcercise(progress, excercise);
          if (progressEntry != null) {
            const isCompletedSet = Progress.isCompletedSet(progress, program, progressEntry.excercise);
            if (isCompletedSet) {
              const weightKey = Reps.display(progressEntry.sets as ISet[]);
              const newValue = program.commit(weightKey, progressEntry);
              if (newValue != null) {
                memo[excercise] = {
                  ...memo[excercise],
                  weights: {
                    ...(memo[excercise]?.weights || {}),
                    [weightKey]: newValue
                  }
                };
              }
            }
          }
          return memo;
        }, {})
      }
    };
  }
}
