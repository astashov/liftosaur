import { createContext, useContext } from "react";
import type { IState } from "../models/state";
import type { IDispatch } from "../ducks/types";

export interface IStateContext {
  state: IState;
  dispatch: IDispatch;
}

export const StateContext = createContext<IStateContext | null>(null);

export function useAppState(): IStateContext {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("StateContext not provided");
  }
  return ctx;
}
