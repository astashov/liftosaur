import { IStats } from "./stats";
import * as IvySaurProgram from "./programs/ivySaurProgram";
import * as The5314bProgram from "./programs/the5314bProgram";
import { ObjectUtils } from "../utils/object";
import { IHistoryRecord } from "./history";
import { IProgress } from "./progress";
import { JSX } from "preact";
import { IExcerciseType, Excercise } from "./excercise";
import { ISet } from "./set";

export interface IProgram {
  id: IProgramId;
  name: string;
  url: string;
  author: string;
  description: JSX.Element;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  days: ((state: any) => IProgramDay)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finishDay: (progress: IProgress, stats: IStats, state: any) => { state: any; stats: IStats };
}

export interface IProgramDay {
  name: string;
  excercises: IProgramDayEntry[];
}

export interface IProgramDayEntry {
  excercise: IExcerciseType;
  sets: ISet[];
}

export type IProgramId = "ivySaur" | "the5314b";

export const programsList: Record<IProgramId, IProgram> = {
  the5314b: The5314bProgram.the5314bProgram,
  ivySaur: IvySaurProgram.ivySaurProgram,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultProgramStates: Record<IProgramId, any> = {
  ivySaur: {},
  the5314b: The5314bProgram.getInitialState(),
};

export namespace Program {
  export function get(name: IProgramId): IProgram {
    return programsList[name];
  }

  export function all(): IProgram[] {
    return ObjectUtils.keys(programsList).map((k) => programsList[k]);
  }

  export function nextProgramRecord(
    program: IProgram,
    previousDay?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    programState?: any
  ): IHistoryRecord {
    const day = Program.nextDay(program, previousDay);
    const programDay = program.days[day];
    return {
      id: Date.now(),
      programId: program.id,
      day,
      startTime: Date.now(),
      endTime: Date.now(),
      entries: programDay(programState).excercises.map((e) => ({
        excercise: e.excercise,
        sets: e.sets,
        warmupSets: Excercise.getWarmupSets(e.excercise, e.sets[0].weight),
      })),
    };
  }

  export function nextDay(program: IProgram, day?: number): number {
    return day != null ? (day + 1) % program.days.length : 0;
  }
}
