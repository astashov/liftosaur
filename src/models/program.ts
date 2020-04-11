import { IExcerciseType } from "../models/excercise";
import { IStats } from "./stats";
import { IProgressEntry } from "./progress";
import { IProgramRecord } from "./history";
import { IProgramSet } from "./set";
import { ivySaurProgram } from "./programs/ivySaurProgram";
import { ObjectUtils } from "../utils/object";

export interface IProgram {
  id: IProgramId;
  name: string;
  url: string;
  author: string;
  days: IProgramDay[];
  increment: (stats: IStats, day: number, excercise: IExcerciseType) => number;
  commit: (weightKey: string, progressEntry: IProgressEntry) => number | undefined;
}

export interface IProgramDay {
  name: string;
  excercises: IProgramExcercise[];
}

export interface IProgramExcercise {
  excercise: IExcerciseType;
  sets: IProgramSet[];
}

export type IProgramId = "ivySaur";

export const programsList: Record<IProgramId, IProgram> = {
  ivySaur: ivySaurProgram
};

export namespace Program {
  export function findExcercise(
    program: IProgram,
    day: number,
    excerciseType: IExcerciseType
  ): IProgramExcercise | undefined {
    return program.days[day]?.excercises.find(e => e.excercise === excerciseType);
  }

  export function getSetForExcercise(
    program: IProgram,
    day: number,
    excercise: IExcerciseType,
    setIndex: number
  ): IProgramSet | undefined {
    return program.days[day]?.excercises?.find(e => e.excercise === excercise)?.sets?.[setIndex];
  }

  export function get(name: IProgramId): IProgram {
    return programsList[name];
  }

  export function all(): IProgram[] {
    return ObjectUtils.keys(programsList).map(k => programsList[k]);
  }

  export function nextProgramRecord(program: IProgram, stats: IStats, previousDay?: number): IProgramRecord {
    const day = Program.nextDay(program, previousDay);
    const programDay = program.days[day];
    return {
      programId: program.id,
      day,
      entries: programDay.excercises.map(e => ({
        excercise: e.excercise,
        sets: e.sets.map(set => {
          const weight = set.weight(stats, day);
          const increment = program.increment(stats, day, e.excercise);
          const newWeight = weight + increment;
          return { reps: set.reps, weight: newWeight };
        })
      }))
    };
  }

  export function nextDay(program: IProgram, day?: number): number {
    return day != null ? (day + 1) % program.days.length : 0;
  }
}
