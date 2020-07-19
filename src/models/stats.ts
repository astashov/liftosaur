import { excerciseTypes } from "./excercise";
import * as t from "io-ts";
import { IArrayElement } from "../utils/types";

export const TStatsExcercisesValue = t.type(
  {
    maxWeight: t.array(
      t.type({
        timestamp: t.number,
        weight: t.number,
        reps: t.number,
        programId: t.string,
        day: t.number,
      })
    ),
  },
  "TStatsExcercisesValue"
);

export type IStatsExcercisesValue = t.TypeOf<typeof TStatsExcercisesValue>;

export const TStatsExcercises = t.partial(
  excerciseTypes.reduce<Record<IArrayElement<typeof excerciseTypes>, typeof TStatsExcercisesValue>>(
    (memo, excerciseType) => {
      memo[excerciseType] = TStatsExcercisesValue;
      return memo;
    },
    {} as Record<IArrayElement<typeof excerciseTypes>, typeof TStatsExcercisesValue>
  ),
  "TStatsExcercises"
);

export type IStatsExcercises = t.TypeOf<typeof TStatsExcercises>;

export const TStats = t.type(
  {
    excercises: TStatsExcercises,
  },
  "TStats"
);

export type IStats = t.TypeOf<typeof TStats>;
