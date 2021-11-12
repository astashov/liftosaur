import { IEnv, IState } from "../models/state";
import { IAction } from "./reducer";

export type IGThunk<TState, TAction> = (
  dispatch: IGDispatch<TState, TAction>,
  getState: () => TState,
  env: IEnv
) => Promise<void>;
export type IGDispatch<TState, TAction> = (action: TAction | IGThunk<TState, TAction>) => Promise<void> | void;

export type IDispatch = IGDispatch<IState, IAction>;
export type IThunk = IGThunk<IState, IAction>;
