import { ISet } from "./types";
import { excercises, IExcercise } from "../models/excercise";

export interface IProgram {
  name: string;
  url: string;
  author: string;
  days: IProgramDay[];
}

export interface IProgramDay {
  name: string;
  excercises: IProgramExcercises[];
}

export interface IProgramExcercises {
  excercise: IExcercise;
  sets: ISet[];
  increment: number;
}

export namespace Program {
  export function getSetForExcercise(
    program: IProgram,
    day: number,
    excercise: IExcercise,
    setIndex: number
  ): ISet | undefined {
    return program.days[day]?.excercises?.find(e => e.excercise.name === excercise.name)?.sets?.[setIndex];
  }

  export function current(programs: IProgram[], name: string): IProgram | undefined {
    return programs.find(p => p.name === name);
  }
}

export const ivySaurProgram: IProgram = {
  name: "IvySaur Program",
  author: "https://old.reddit.com/user/lvysaur",
  url: "https://old.reddit.com/r/Fitness/comments/4uijsl/a_detailed_look_at_why_stronglifts_starting",
  days: [
    {
      name: "Week A Day 1",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [4, 4, 4, 4],
          increment: 10
        },
        {
          excercise: excercises.squat,
          sets: [8, 8, 8, 8],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [8, 8, 8, 8],
          increment: 5
        },
        {
          excercise: excercises.chinups,
          sets: [8, 8, 8, 8],
          increment: 0
        }
      ]
    },
    {
      name: "Week A Day 2",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [8, 8, 8, 8],
          increment: 10
        },
        {
          excercise: excercises.deadlift,
          sets: [4, 4, 4, 4],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [4, 4, 4, 4],
          increment: 5
        },
        {
          excercise: excercises.barbellRows,
          sets: [8, 8, 8, 8],
          increment: 10
        }
      ]
    },
    {
      name: "Week A Day 3",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [4, 4, 4, "amrap"],
          increment: 10
        },
        {
          excercise: excercises.squat,
          sets: [4, 4, 4, "amrap"],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [8, 8, 8, 8],
          increment: 5
        },
        {
          excercise: excercises.chinups,
          sets: [4, 4, 4, 4],
          increment: 0
        }
      ]
    },
    {
      name: "Week B Day 1",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [8, 8, 8, 8],
          increment: 10
        },
        {
          excercise: excercises.deadlift,
          sets: [8, 8, 8, 8],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [4, 4, 4, 4],
          increment: 5
        },
        {
          excercise: excercises.barbellRows,
          sets: [4, 4, 4, 4],
          increment: 10
        }
      ]
    },
    {
      name: "Week B Day 2",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [4, 4, 4, 4],
          increment: 10
        },
        {
          excercise: excercises.squat,
          sets: [8, 8, 8, 8],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [8, 8, 8, 8],
          increment: 5
        },
        {
          excercise: excercises.chinups,
          sets: [8, 8, 8, 8],
          increment: 0
        }
      ]
    },
    {
      name: "Week B Day 3",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [8, 8, 8, 8],
          increment: 10
        },
        {
          excercise: excercises.deadlift,
          sets: [4, 4, 4, "amrap"],
          increment: 15
        },
        {
          excercise: excercises.overheadPress,
          sets: [4, 4, 4, "amrap"],
          increment: 5
        },
        {
          excercise: excercises.barbellRows,
          sets: [8, 8, 8, 8],
          increment: 10
        }
      ]
    }
  ]
};
