import { IStats } from "./stats";
import * as The5314bProgram from "./programs/the5314bProgram";
import * as BasicBeginnerProgram from "./programs/basicBeginner";
import * as DbPplProgram from "./programs/dbPpl";
import { ObjectUtils } from "../utils/object";
import { IHistoryRecord } from "./history";
import { JSX } from "preact";
import { IExcerciseType, Excercise, TExcerciseType } from "./excercise";
import * as t from "io-ts";
import { ISet, TProgramSet } from "./set";

export interface IProgram {
  id: IProgramId;
  name: string;
  url: string;
  author: string;
  description: JSX.Element;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  days: ((state: any) => IProgramDay)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finishDay: (progress: IHistoryRecord, stats: IStats, state: any) => { state: any; stats: IStats };
}

export const TProgramDayEntry2 = t.type(
  {
    excercise: TExcerciseType,
    sets: t.array(TProgramSet),
  },
  "TProgramDayEntry2"
);
export type IProgramDayEntry2 = t.TypeOf<typeof TProgramDayEntry2>;

export const TProgramDay2 = t.type(
  {
    name: t.string,
    excercises: t.array(TProgramDayEntry2),
  },
  "TProgramDay2"
);
export type IProgramDay2 = t.TypeOf<typeof TProgramDay2>;

export const TProgram2 = t.type(
  {
    isProgram2: t.boolean,
    id: t.string,
    name: t.string,
    description: t.string,
    days: t.array(TProgramDay2),
    initialState: t.dictionary(t.string, t.number),
    finishDayExpr: t.string,
  },
  "TProgram2"
);
export type IProgram2 = t.TypeOf<typeof TProgram2>;

export const TEditProgram = t.intersection(
  [
    t.interface({
      program: TProgram2,
    }),
    t.partial({
      editDay: t.intersection([
        t.interface({
          day: TProgramDay2,
        }),
        t.partial({
          index: t.number,
        }),
      ]),
    }),
  ],
  "TEditProgram"
);
export type IEditProgram = t.TypeOf<typeof TEditProgram>;

export interface IProgramDay {
  name: string;
  excercises: IProgramDayEntry[];
}

export interface IProgramDayEntry {
  excercise: IExcerciseType;
  sets: ISet[];
}

export const TProgramId = t.keyof(
  {
    basicBeginner: null,
    the5314b: null,
    dbPpl: null,
  },
  "TProgramId"
);
export type IProgramId = t.TypeOf<typeof TProgramId>;

export const programsList: Record<IProgramId, IProgram> = {
  basicBeginner: BasicBeginnerProgram.basicBeginnerProgram,
  the5314b: The5314bProgram.the5314bProgram,
  dbPpl: DbPplProgram.dbPplProgram,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultProgramStates: Record<IProgramId, any> = {
  basicBeginner: BasicBeginnerProgram.getInitialState(),
  dbPpl: DbPplProgram.getInitialState(),
  the5314b: The5314bProgram.getInitialState(),
};

export namespace Program {
  export function get(name: IProgramId): IProgram {
    return programsList[name];
  }

  export function all(): IProgram[] {
    return ObjectUtils.keys(programsList).map((k) => programsList[k]);
  }

  export function createDay(name: string): IProgramDay2 {
    return {
      name,
      excercises: [],
    };
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
      id: 0,
      date: new Date().toISOString(),
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
