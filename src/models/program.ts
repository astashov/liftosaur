import { IExcercise, IExcerciseType } from "../models/excercise";
import { IStats } from "./stats";
import { IProgress, IProgressEntry } from "./progress";
import { IHistoryRecord, IProgramRecord } from "./history";
import { IProgramSet } from "./set";
import { ivySaurProgram } from "./programs/ivySaurProgram";
import { ObjectUtils } from "../utils/object";

export interface IProgram {
  id: IProgramId;
  name: string;
  url: string;
  author: string;
  days: IProgramDay[];
  increment: (stats: IStats, day: number, excercise: IExcercise) => number;
  commit: (weightKey: string, progressEntry: IProgressEntry) => number | undefined;
}

export interface IProgramDay {
  name: string;
  excercises: IProgramExcercise[];
}

export interface IProgramExcercise {
  excercise: IExcercise;
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
    return program.days[day]?.excercises.find(e => e.excercise.id === excerciseType);
  }

  export function finishProgramDay(program: IProgram, progress: IProgress): IHistoryRecord {
    const programDay = program.days[progress.day];
    const entries = progress.entries.filter(entry => {
      const programSets = programDay.excercises.find(e => e.excercise.id === entry.excercise.id);
      return entry.sets.length === programSets?.sets.length && entry.sets.some(s => s != null);
    });
    return {
      date: new Date().toISOString(),
      programId: program.id,
      day: progress.day,
      entries: entries.map(e => {
        const setsLength = programDay.excercises.find(ex => ex.excercise.name === e.excercise.name)!.sets.length;
        const sets = [];
        for (let i = 0; i < setsLength; i += 1) {
          const rep = e.sets[i];
          sets.push({ reps: rep?.reps ?? 0, weight: rep?.weight ?? 0 });
        }
        return {
          excercise: e.excercise,
          sets: sets
        };
      })
    };
  }

  export function getSetForExcercise(
    program: IProgram,
    day: number,
    excercise: IExcercise,
    setIndex: number
  ): IProgramSet | undefined {
    return program.days[day]?.excercises?.find(e => e.excercise.name === excercise.name)?.sets?.[setIndex];
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
      programName: program.name,
      day,
      entries: programDay.excercises.map(e => ({
        excercise: e.excercise,
        sets: e.sets.map(set => {
          const weight = set.weight(stats, day);
          const increment = program.increment(stats, day, e.excercise);
          const newWeight = weight + increment;
          console.log(weight, increment, newWeight);
          return { reps: set.reps, weight: newWeight };
        })
      }))
    };
  }

  export function nextDay(program: IProgram, day?: number): number {
    return day != null ? (day + 1) % program.days.length : 0;
  }
}
