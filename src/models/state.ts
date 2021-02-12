import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { IScreen } from "./screen";
import { IDispatch } from "../ducks/types";
import { ILensRecordingPayload } from "lens-shmens";
import { IUser } from "./user";
import { IStorage, IProgram, IHistoryRecord, IProgramExercise, IProgramDay } from "../types";

export type IEnv = {
  service: Service;
  audio: AudioInterface;
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
