import { IAction, IState, IEnv } from "./reducer";

export type IThunk = (dispatch: IDispatch, getState: () => IState, env: IEnv) => Promise<void>;
export type IDispatch = (action: IAction | IThunk) => Promise<void> | void;
