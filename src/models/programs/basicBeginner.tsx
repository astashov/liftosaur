import { IProgram, IProgramDay, IProgramDayEntry } from "../program";
import { IStats } from "../stats";
import { Weight } from "../weight";
import { h } from "preact";
import { lf } from "../../utils/lens";
import { IHistoryRecord } from "../history";

export function getInitialState(): IBasicBeginnerState {
  return {
    barbellRows: { weight: 95 },
    benchPress: { weight: 45 },
    overheadPress: { weight: 45 },
    deadlift: { weight: 95 },
    squat: { weight: 45 },
    chinups: { weight: 0 },
  };
}

export type IBasicBeginnerExcerciseType =
  | "benchPress"
  | "deadlift"
  | "overheadPress"
  | "squat"
  | "barbellRows"
  | "chinups";

export type IBasicBeginnerState = {
  [P in IBasicBeginnerExcerciseType]: IBasicBeginnerStateEntry;
};

export type IBasicBeginnerStateEntry = {
  weight: number;
};

function programDayEntry(state: IBasicBeginnerState, excercise: IBasicBeginnerExcerciseType): IProgramDayEntry {
  return {
    excercise,
    sets: [
      { reps: 5, weight: state[excercise].weight },
      { reps: 5, weight: state[excercise].weight },
      { reps: 5, weight: state[excercise].weight, isAmrap: true },
    ],
  };
}

export const basicBeginnerProgram: IProgram = {
  id: "basicBeginner",
  name: "Basic Beginner Routine",
  author: "/r/fitness",
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  description: (
    <div>
      <p>This is a great starting routine for complete beginners.</p>
      <p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p>
      <p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p>
    </div>
  ),
  finishDay: (
    progress: IHistoryRecord,
    aStats: IStats,
    aState?: IBasicBeginnerState
  ): { state: IBasicBeginnerState; stats: IStats } => {
    let state: IBasicBeginnerState = aState || getInitialState();
    progress.entries.forEach((entry) => {
      const totalReps = entry.sets.reduce<number>((memo, i) => memo + (i.completedReps || 0), 0);
      const weight = entry.sets[0].weight;
      const isSuccess = totalReps >= 15;
      if (isSuccess) {
        let increase: number;
        if (entry.excercise === "chinups") {
          increase = 0;
        } else if (entry.excercise === "deadlift" || entry.excercise === "squat") {
          increase = 5;
        } else {
          increase = 2.5;
        }
        if ((entry.sets[entry.sets.length - 1].completedReps || 0) > 10) {
          increase *= 2;
        }
        state = lf(state)
          .p(entry.excercise as IBasicBeginnerExcerciseType)
          .p("weight")
          .set(weight + increase);
      } else {
        state = lf(state)
          .p(entry.excercise as IBasicBeginnerExcerciseType)
          .p("weight")
          .set(Weight.round(weight * 0.9));
      }
    });

    return { state, stats: aStats };
  },
  days: [
    (state?: IBasicBeginnerState): IProgramDay => {
      state = state || getInitialState();
      return {
        name: "Workout A",
        excercises: [
          programDayEntry(state, "barbellRows"),
          programDayEntry(state, "benchPress"),
          programDayEntry(state, "squat"),
        ],
      };
    },
    (state?: IBasicBeginnerState): IProgramDay => {
      state = state || getInitialState();
      return {
        name: "Workout B",
        excercises: [
          programDayEntry(state, "chinups"),
          programDayEntry(state, "overheadPress"),
          programDayEntry(state, "deadlift"),
        ],
      };
    },
  ],
};
