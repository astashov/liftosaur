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
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ISettings } from "./settings";
import { Screen } from "./screen";
import { updateState, IState } from "../ducks/reducer";
import { lb, ILensRecordingPayload } from "../utils/lens";
import { IDispatch } from "../ducks/types";

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

export const TProgramInternalState = t.type(
  {
    nextDay: t.number,
  },
  "TProgramInternalState"
);
export type IProgramInternalState = t.TypeOf<typeof TProgramInternalState>;

export const TProgram2 = t.type(
  {
    isProgram2: t.boolean,
    id: t.string,
    name: t.string,
    description: t.string,
    days: t.array(TProgramDay2),
    state: t.dictionary(t.string, t.number),
    internalState: TProgramInternalState,
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

  export function getProgram(state: IState, id: string): IProgram2 | undefined {
    return state.storage.programs.find((p) => p.id === id);
  }

  export function getEditingProgram(state: IState): IProgram2 | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id);
  }

  export function getEditingProgramIndex(state: IState): number {
    return state.storage.programs.findIndex((p) => p.id === state.editProgram?.id);
  }

  export function getEditingDay(state: IState): IProgramDay2 | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id)?.days?.[state.editProgram?.dayIndex || 0];
  }

  export function getProgramIndex(state: IState, id: string): number {
    return state.storage.programs.findIndex((p) => p.id === id);
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

  export function isProgram2(program: IProgram | IProgram2): program is IProgram2 {
    return "isProgram2" in program && program.isProgram2;
  }

  export function nextProgramRecord(
    program: IProgram | IProgram2,
    settings: ISettings,
    previousDay?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    programState?: any
  ): IHistoryRecord {
    if (isProgram2(program)) {
      const day = program.internalState.nextDay || 1;
      const programDay = program.days[day - 1];
      return {
        id: 0,
        date: new Date().toISOString(),
        programId: program.id,
        day,
        startTime: Date.now(),
        entries: programDay.excercises.map((entry) => {
          const sets: ISet[] = entry.sets.map((set) => ({
            isAmrap: set.isAmrap,
            reps: new ScriptRunner(
              set.repsExpr,
              program.state,
              Progress.createEmptyScriptBindings(day),
              Progress.createScriptFunctions(settings)
            ).execute(true),
            weight: new ScriptRunner(
              set.weightExpr,
              program.state,
              Progress.createEmptyScriptBindings(day),
              Progress.createScriptFunctions(settings)
            ).execute(true),
          }));
          return {
            excercise: entry.excercise,
            sets,
            warmupSets: Excercise.getWarmupSets(entry.excercise, sets[0].weight),
          };
        }),
      };
    } else {
      const day = Program.nextDay(program, previousDay);
      const programDay = program.days[day];
      return {
        id: 0,
        date: new Date().toISOString(),
        programId: program.id,
        day,
        startTime: Date.now(),
        entries: programDay(programState).excercises.map((e) => ({
          excercise: e.excercise,
          sets: e.sets,
          warmupSets: Excercise.getWarmupSets(e.excercise, e.sets[0].weight),
        })),
      };
    }
  }

  export function cloneProgram2(dispatch: IDispatch, program: IProgram2): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          if (programs.some((p) => p.id === program.id)) {
            if (
              confirm(
                "You already have this program cloned. Do you want to override? All your modifications of this program will be lost."
              )
            ) {
              return programs.map((p) => (p.id === program.id ? program : p));
            } else {
              return programs;
            }
          } else {
            return [...programs, program];
          }
        }),
      ...selectProgram2LensRecordings(program.id),
    ]);
  }

  export function selectProgram2(dispatch: IDispatch, programId: string): void {
    updateState(dispatch, selectProgram2LensRecordings(programId));
  }

  export function nextDay(program: IProgram | IProgram2, day?: number): number {
    return (day != null ? day % program.days.length : 0) + 1;
  }

  function selectProgram2LensRecordings(programId: string): ILensRecordingPayload<IState>[] {
    return [
      lb<IState>().p("storage").p("currentProgram2Id").record(programId),
      lb<IState>()
        .p("screenStack")
        .recordModify((s) => Screen.push(s, "main")),
    ];
  }
}
