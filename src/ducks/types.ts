import { LensBuilder, ILensRecordingPayload } from "lens-shmens";
import { IEnv, IState } from "../models/state";
import { ILensDispatch } from "../utils/useLensReducer";
import { IAction } from "./reducer";

export function buildCustomDispatch<T, O = never>(
  originalDispatch: IDispatch,
  builder: LensBuilder<IState, T, {}, O>
): ILensDispatch<T> {
  return (lensRecording: ILensRecordingPayload<T>[] | ILensRecordingPayload<T>, desc: string) => {
    const recordings = (Array.isArray(lensRecording) ? lensRecording : [lensRecording]).map((recording) => {
      return recording.prepend(builder);
    });
    originalDispatch({ type: "UpdateState", lensRecording: recordings, desc });
  };
}

export function buildCustomLensDispatch<T, U, O = never>(
  originalDispatch: ILensDispatch<T>,
  builder: LensBuilder<T, U, {}, O>
): ILensDispatch<U> {
  return (lensRecording: ILensRecordingPayload<U>[] | ILensRecordingPayload<U>, desc: string) => {
    const recordings = (Array.isArray(lensRecording) ? lensRecording : [lensRecording]).map((recording) => {
      return recording.prepend(builder);
    });
    originalDispatch(recordings, desc);
  };
}

export type IGThunk<TState, TAction, TEnv> = (
  dispatch: IGDispatch<TState, TAction, TEnv>,
  getState: () => TState,
  env: TEnv
) => Promise<void>;
export type IGDispatch<TState, TAction, TEnv> = (
  action: TAction | IGThunk<TState, TAction, TEnv>
) => Promise<void> | void;
export type IReducerOnIGAction<TState, TAction, TEnv> = (
  dispatch: IGDispatch<TState, TAction, TEnv>,
  action: TAction | IGThunk<TState, TAction, TEnv>,
  oldState: TState,
  newState: TState
) => void | Promise<void>;

export type IDispatch = IGDispatch<IState, IAction, IEnv>;
export type IThunk = IGThunk<IState, IAction, IEnv>;
export type IReducerOnAction = IReducerOnIGAction<IState, IAction, IEnv>;
