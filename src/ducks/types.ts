import { IAction } from "./reducer";
import { IState, IEnv } from "../models/state";

export type IThunk = (dispatch: IDispatch, getState: () => IState, env: IEnv) => Promise<void>;
export type IDispatch = (action: IAction | IThunk) => Promise<void> | void;
