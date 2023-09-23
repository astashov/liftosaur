import { Service } from "../api/service";
import { IAudioInterface } from "../lib/audioInterface";
import { IScreen } from "./screen";
import { IDispatch } from "../ducks/types";
import { ILensRecordingPayload } from "lens-shmens";
import { IUser } from "./user";
import {
  IStorage,
  IProgram,
  IHistoryRecord,
  IProgramExercise,
  IProgramDay,
  ISettings,
  IExerciseType,
  IEquipment,
} from "../types";

export type IEnv = {
  service: Service;
  audio: IAudioInterface;
};

export type IFriendStatus = "invited" | "active" | "pending" | "loading";

export interface IFriend {
  user: {
    id: string;
    nickname?: string;
  };
  status?: IFriendStatus;
}

export interface ILike {
  friendIdHistoryRecordId: string;
  userId: string;
  userNickname: string;
  friendId: string;
  historyRecordId: number;
  timestamp: number;
}

export interface IFriendUser {
  id: string;
  nickname: string;
  storage: Omit<IStorage, "programs" | "stats">;
}

export interface INotification {
  type: "error" | "success";
  content: string;
}

export interface IAllFriends {
  friends: Partial<Record<string, IFriend>>;
  sortedIds: string[];
  isLoading: boolean;
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

export interface IAllComments {
  comments: Partial<Record<string, IComment[]>>;
  isLoading: boolean;
  isPosting: boolean;
  isRemoving: Partial<Record<string, boolean>>;
}

export interface IAllLikes {
  likes: Partial<Record<string, ILike[]>>;
  isLoading: boolean;
}

export interface IComment {
  id: string;
  userId: string;
  friendId: string;
  historyRecordId: string;
  timestamp: number;
  text: string;
}

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
  programs: IProgram[];
  allFriends: IAllFriends;
  likes: IAllLikes;
  friendsHistory: Partial<Record<string, IFriendUser>>;
  notification?: INotification;
  screenStack: IScreen[];
  currentHistoryRecord?: number;
  loading: ILoading;
  defaultEquipmentExpanded?: IEquipment;
  currentHistoryRecordUserId?: string;
  subscriptionLoading?: ISubscriptionLoading;
  progress: Partial<Record<number, IHistoryRecord>>;
  comments: IAllComments;
  previewProgram?: {
    id: string;
    showCustomPrograms?: boolean;
  };
  editProgram?: {
    id: string;
    dayIndex?: number;
    weekIndex?: number;
  };
  viewExerciseType?: IExerciseType;
  editExercise?: IProgramExercise;
  adminKey?: string;
  showWhatsNew?: boolean;
  showSignupRequest?: boolean;
  freshMigrations: boolean;
  errors: IStateErrors;
}

export interface ILocalStorage {
  storage?: IStorage;
  progress?: IHistoryRecord;
  editDay?: IProgramDay;
}

export function updateState(dispatch: IDispatch, lensRecording: ILensRecordingPayload<IState>[], desc?: string): void {
  dispatch({ type: "UpdateState", lensRecording, desc });
}

export function updateSettings(dispatch: IDispatch, lensRecording: ILensRecordingPayload<ISettings>): void {
  dispatch({ type: "UpdateSettings", lensRecording });
}
