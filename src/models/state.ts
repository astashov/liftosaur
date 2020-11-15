import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { IProgram, IProgramExercise, TProgram, IProgramDay } from "./program";
import { IScreen } from "./screen";
import { IHistoryRecord, THistoryRecord } from "./history";
import * as t from "io-ts";
import { TSettings } from "./settings";
import { IDispatch } from "../ducks/types";
import { ILensRecordingPayload } from "../utils/lens";
import { IUser } from "./user";

export type IEnv = {
  service: Service;
  audio: AudioInterface;
  googleAuth?: gapi.auth2.GoogleAuth;
};

export interface IState {
  user?: IUser;
  storage: IStorage;
  programs: IProgram[];
  webpushr?: IWebpushr;
  screenStack: IScreen[];
  currentHistoryRecord?: number;
  progress: Record<number, IHistoryRecord | undefined>;
  editProgram?: {
    id: string;
    dayIndex?: number;
  };
  editExercise?: IProgramExercise;
  adminKey?: string;
}

export const TStorage = t.type(
  {
    id: t.number,
    history: t.array(THistoryRecord),
    settings: TSettings,
    currentProgramId: t.union([t.string, t.undefined]),
    version: t.string,
    programs: t.array(TProgram),
    helps: t.array(t.string),
  },
  "TStorage"
);
export type IStorage = Readonly<t.TypeOf<typeof TStorage>>;

export interface IWebpushr {
  sid: number;
}

export interface ILocalStorage {
  storage?: IStorage;
  progress?: IHistoryRecord;
  editDay?: IProgramDay;
}

export function updateState(dispatch: IDispatch, lensRecording: ILensRecordingPayload<IState>[], desc?: string): void {
  dispatch({ type: "UpdateState", lensRecording, desc });
}
