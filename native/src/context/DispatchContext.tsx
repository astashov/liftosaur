import React, { createContext, useContext } from "react";
import type { IDispatch } from "@shared/ducks/types";

const DispatchContext = createContext<IDispatch | null>(null);

interface IProps {
  dispatch: IDispatch;
  children: React.ReactNode;
}

export function DispatchProvider({ dispatch, children }: IProps): React.ReactElement {
  return <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>;
}

export function useDispatch(): IDispatch {
  const dispatch = useContext(DispatchContext);
  if (dispatch == null) {
    throw new Error("useDispatch must be used within a NativeAppProvider");
  }
  return dispatch;
}
