import { IProgram, IProgramDay, IProgramDayEntry } from "../program";
import { IStats } from "../stats";
import { h } from "preact";
import { lf } from "../../utils/lens";
import { IHistoryRecord } from "../history";
import { Excercise } from "../excercise";
import { Progress } from "../progress";
import { Weight } from "../weight";
import * as t from "io-ts";

export function getInitialState(): IDbPplState {
  return {
    dbBenchPress: { weight: Excercise.get("dbBenchPress").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbInclineFly: { weight: Excercise.get("dbInclineFly").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbArnoldPress: { weight: Excercise.get("dbArnoldPress").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbTricepsExtension: {
      weight: Excercise.get("dbTricepsExtension").startWeight,
      increment: 2.5,
      failures: 0,
      lastReps: 0,
    },
    pullups: { weight: Excercise.get("pullups").startWeight, increment: 0, failures: 0, lastReps: 0 },
    dbRow: { weight: Excercise.get("dbRow").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbLateralRaise: { weight: Excercise.get("dbLateralRaise").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbShrug: { weight: Excercise.get("dbShrug").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbBicepCurl: { weight: Excercise.get("dbBicepCurl").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbGobletSquat: { weight: Excercise.get("dbGobletSquat").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbLunge: { weight: Excercise.get("dbLunge").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    dbSingleLegDeadlift: {
      weight: Excercise.get("dbSingleLegDeadlift").startWeight,
      increment: 2.5,
      failures: 0,
      lastReps: 0,
    },
    dbCalfRaise: { weight: Excercise.get("dbCalfRaise").startWeight, increment: 2.5, failures: 0, lastReps: 0 },
    legRaises: { weight: Excercise.get("legRaises").startWeight, increment: 0, failures: 0, lastReps: 0 },
  };
}

export const TDbPplExcerciseType = t.keyof(
  {
    dbBenchPress: null,
    dbInclineFly: null,
    dbArnoldPress: null,
    dbTricepsExtension: null,
    pullups: null,
    dbRow: null,
    dbLateralRaise: null,
    dbShrug: null,
    dbBicepCurl: null,
    dbGobletSquat: null,
    dbLunge: null,
    dbSingleLegDeadlift: null,
    dbCalfRaise: null,
    legRaises: null,
  },
  "TDbPplExcerciseType"
);
export type IDbPplExcerciseType = t.TypeOf<typeof TDbPplExcerciseType>;

export const TDbPplStateEntry = t.type(
  {
    weight: t.number,
    increment: t.number,
    failures: t.number,
    lastReps: t.number,
  },
  "TDbPplStateEntry"
);
export type IDbPplStateEntry = t.TypeOf<typeof TDbPplStateEntry>;

export const TDbPplState = t.dictionary(TDbPplExcerciseType, TDbPplStateEntry, "TDbPplState");
export type IDbPplState = t.TypeOf<typeof TDbPplState>;

function programDayEntry(state: IDbPplState, excercise: IDbPplExcerciseType): IProgramDayEntry {
  return {
    excercise,
    sets: [
      { reps: 12, weight: state[excercise].weight },
      { reps: 12, weight: state[excercise].weight },
      { reps: 12, weight: state[excercise].weight },
    ],
  };
}

export const dbPplProgram: IProgram = {
  id: "dbPpl",
  name: "Dumbbell P/P/L",
  author: "/u/gregariousHermit",
  url: "https://old.reddit.com/r/Fitness/comments/2e79y4/dumbbell_ppl_proposed_alternative_to_dumbbell/",
  description: (
    <div>
      <p>
        This is a great starting routine for beginners if you only have dumbbells available. If you have a barbell, then
        your better bet is 'Basic Beginner Routine'.
      </p>
      <p>It's a Push/Pull/Legs routine with linear progressing, each day is focused on either Push, Pull or Legs.</p>
      <p>You'll need a bench, adjustable dumbbells and a pull-up bar.</p>
    </div>
  ),
  finishDay: (
    progress: IHistoryRecord,
    aStats: IStats,
    aState?: IDbPplState
  ): { state: IDbPplState; stats: IStats } => {
    let state: IDbPplState = aState || getInitialState();
    progress.entries.forEach((entry) => {
      const isCompleted = Progress.isCompletedSet(entry);
      const totalReps = entry.sets.reduce<number>((memo, i) => memo + (i.completedReps || 0), 0);
      const excercise = entry.excercise as IDbPplExcerciseType;
      const weight = entry.sets[0].weight;
      if (isCompleted) {
        state = lf(state)
          .p(excercise)
          .p("weight")
          .set(weight + state[excercise].increment);
        state = lf(state).p(excercise).p("failures").set(0);
      } else if (totalReps <= state[excercise].lastReps) {
        state = lf(state)
          .p(excercise)
          .p("failures")
          .modify((v) => v + 1);
      }
      if (state[excercise].failures >= 3) {
        state = lf(state)
          .p(excercise)
          .p("weight")
          .modify((v) => Weight.round(v - state[excercise].increment * 2));
      }
      state = lf(state).p(excercise).p("lastReps").set(totalReps);
    });

    return { state, stats: aStats };
  },
  days: [
    (state?: IDbPplState): IProgramDay => {
      state = state || getInitialState();
      return {
        name: "Push",
        excercises: [
          programDayEntry(state, "dbBenchPress"),
          programDayEntry(state, "dbInclineFly"),
          programDayEntry(state, "dbArnoldPress"),
          programDayEntry(state, "dbTricepsExtension"),
          programDayEntry(state, "legRaises"),
        ],
      };
    },
    (state?: IDbPplState): IProgramDay => {
      state = state || getInitialState();
      return {
        name: "Pull",
        excercises: [
          programDayEntry(state, "pullups"),
          programDayEntry(state, "dbRow"),
          programDayEntry(state, "dbLateralRaise"),
          programDayEntry(state, "dbShrug"),
          programDayEntry(state, "dbBicepCurl"),
        ],
      };
    },
    (state?: IDbPplState): IProgramDay => {
      state = state || getInitialState();
      return {
        name: "Legs",
        excercises: [
          programDayEntry(state, "dbGobletSquat"),
          programDayEntry(state, "dbLunge"),
          programDayEntry(state, "dbSingleLegDeadlift"),
          programDayEntry(state, "dbCalfRaise"),
          programDayEntry(state, "legRaises"),
        ],
      };
    },
  ],
};
