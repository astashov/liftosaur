import { Service } from "../api/service";
import { IAudioInterface } from "../lib/audioInterface";
import { IScreenStack } from "./screen";
import { IDispatch } from "../ducks/types";
import { Storage } from "../models/storage";
import { ILensRecordingPayload } from "lens-shmens";
import { IUser } from "./user";
import { IStorage, IProgram, IHistoryRecord, IProgramDay, ISettings, IExerciseType, IEquipment } from "../types";
import { AsyncQueue } from "../utils/asyncQueue";
import { basicBeginnerProgram } from "../programs/basicBeginnerProgram";
import { IPlannerState } from "../pages/planner/models/types";

export type IEnv = {
  service: Service;
  audio: IAudioInterface;
  queue: AsyncQueue;
};

export interface INotification {
  type: "error" | "success";
  content: string;
}

export interface INavCommon {
  loading: ILoading;
  userId?: string;
  screenStack: IScreenStack;
  currentProgram?: IProgram;
  allPrograms: IProgram[];
  progress?: IHistoryRecord;
  settings: ISettings;
}

export interface ILoadingItem {
  startTime: number;
  type: string;
  attempt?: number;
  endTime?: number;
  error?: string;
}

export type ILoading = {
  items: Partial<Record<string, ILoadingItem>>;
};

export interface ISubscriptionLoading {
  monthly?: boolean;
  yearly?: boolean;
  lifetime?: boolean;
}

export interface IStateErrors {
  corruptedstorage?: {
    userid: string;
    backup: boolean;
    confirmed: boolean;
    local: boolean;
  };
}

export interface IState {
  user?: IUser;
  storage: IStorage;
  lastSyncedStorage?: IStorage;
  programs: IProgram[];
  notification?: INotification;
  screenStack: IScreenStack;
  revisions: Partial<Record<string, string[]>>;
  prices?: Partial<Record<string, string>>;
  loading: ILoading;
  defaultEquipmentExpanded?: IEquipment;
  subscriptionLoading?: ISubscriptionLoading;
  progress: Partial<Record<number, IHistoryRecord>>;
  previewProgram?: {
    id: string;
    showCustomPrograms?: boolean;
  };
  editProgramV2?: IPlannerState;
  muscleView?: {
    type: "program" | "day";
    programId?: string;
    day?: number;
  };
  viewExerciseType?: IExerciseType;
  adminKey?: string;
  showWhatsNew?: boolean;
  showSignupRequest?: boolean;
  freshMigrations: boolean;
  errors: IStateErrors;
  reportedCorruptedStorage?: boolean;
  nosync: boolean;
  selectedGymId?: string;
}

export interface ILocalStorage {
  storage?: IStorage;
  progress?: IHistoryRecord;
  lastSyncedStorage?: IStorage;
  editDay?: IProgramDay;
}

export function buildState(args: {
  storage?: IStorage;
  shouldSkipIntro?: boolean;
  notification?: INotification;
  userId?: string;
  nosync?: boolean;
}): IState {
  return {
    screenStack: [{ name: args.shouldSkipIntro ? "programs" : "first" }],
    progress: {},
    programs: [basicBeginnerProgram],
    loading: { items: {} },
    notification: args.notification,
    storage: args.storage || Storage.getDefault(),
    user: args.userId ? { email: args.userId, id: args.userId } : undefined,
    errors: {},
    revisions: {},
    freshMigrations: false,
    nosync: !!args.nosync,
  };
}

export function updateState(dispatch: IDispatch, lensRecording: ILensRecordingPayload<IState>[], desc?: string): void {
  dispatch({ type: "UpdateState", lensRecording, desc });
}

export function updateSettings(dispatch: IDispatch, lensRecording: ILensRecordingPayload<ISettings>): void {
  dispatch({ type: "UpdateSettings", lensRecording });
}

export function updateProgress(
  dispatch: IDispatch,
  lensRecordings: ILensRecordingPayload<IHistoryRecord>[] | ILensRecordingPayload<IHistoryRecord>,
  desc?: string
): void {
  const recordings = Array.isArray(lensRecordings) ? lensRecordings : [lensRecordings];
  dispatch({ type: "UpdateProgress", lensRecordings: recordings, desc });
}
