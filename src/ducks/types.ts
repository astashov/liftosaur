import { IEnv, IState } from "../models/state";
import { IAction } from "./reducer";

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
