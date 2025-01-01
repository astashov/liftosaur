/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reducer } from "react";
import { IDispatch, IReducerOnIGAction } from "../ducks/types";
import { IState, IEnv } from "../models/state";
import { useThunkReducer } from "./useThunkReducer";
import { IAction } from "../ducks/reducer";
import { Thunk } from "../ducks/thunks";
import { lensRegistry } from "../lensRegistry";
import { ITail } from "./types";

export function sendLens(
  dispatch: IDispatch,
  name: keyof typeof lensRegistry,
  ...rest: ITail<Parameters<(typeof lensRegistry)[keyof typeof lensRegistry]>>
): void {
  dispatch({ type: "Lens", name, args: rest });
}

export function sendThunk(
  dispatch: IDispatch,
  name: keyof typeof Thunk,
  ...rest: Parameters<(typeof Thunk)[keyof typeof Thunk]>
): void {
  dispatch({ type: "Thunk", name, args: rest });
}

export function useLiftosaurThunkReducer(
  reducer: Reducer<IState, IAction>,
  initialState: IState,
  env: IEnv,
  onActions: IReducerOnIGAction<IState, IAction, IEnv>[] = []
): [IState, IDispatch] {
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(reducer, initialState, env, onActions);
  const augmentedDispatch: IDispatch = (action) => {
    if (typeof action !== "function" && action.type === "Thunk") {
      const fn = Thunk[action.name];
      return dispatch((fn as any).apply(null, action.args));
    } else if (typeof action !== "function" && action.type === "Lens") {
      const fn = lensRegistry[action.name];
      return (fn as any).apply(null, [dispatch, ...action.args]);
    } else {
      return dispatch(action);
    }
  };
  return [state, augmentedDispatch];
}
