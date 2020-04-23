import { IStats } from "./stats";
import { ivySaurProgram } from "./programs/ivySaurProgram";
import { the5314bProgram } from "./programs/the5314bProgram";
import { ObjectUtils } from "../utils/object";
import { IHistoryRecord, IHistoryEntry } from "./history";
import { IProgress } from "./progress";

export interface IProgram {
  id: IProgramId;
  name: string;
  url: string;
  author: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  days: ((state: any) => IProgramDay)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finishDay: (progress: IProgress, stats: IStats, state: any) => { state: any; stats: IStats };
}

export interface IProgramDay {
  name: string;
  excercises: IHistoryEntry[];
}

export type IProgramId = "ivySaur" | "the5314b";

export const programsList: Record<IProgramId, IProgram> = {
  ivySaur: ivySaurProgram,
  the5314b: the5314bProgram
};

export namespace Program {
  export function get(name: IProgramId): IProgram {
    return programsList[name];
  }

  export function all(): IProgram[] {
    return ObjectUtils.keys(programsList).map(k => programsList[k]);
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
      entries: programDay(programState).excercises
    };
  }

  export function nextDay(program: IProgram, day?: number): number {
    return day != null ? (day + 1) % program.days.length : 0;
  }
}
