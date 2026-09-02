import { createContext, useCallback, useContext } from "react";
import type { IDispatch } from "../ducks/types";
import { Thunk_log, Thunk_postevent } from "../ducks/thunks";

export const ClickTrackingContext = createContext<IDispatch | null>(null);

export function useTrackClick(): (name: string, className?: string, extra?: Record<string, string | number>) => void {
  const dispatch = useContext(ClickTrackingContext);
  return useCallback(
    (name: string, className?: string, extra?: Record<string, string | number>) => {
      if (!dispatch) {
        return;
      }
      const lsClass = className?.split(/\s+/).find((c) => c.startsWith("ls-"));
      const eventName = lsClass || `nm-${name}`;
      dispatch(Thunk_postevent("click-" + eventName, extra));
      if (lsClass) {
        dispatch(Thunk_log(lsClass));
      }
    },
    [dispatch]
  );
}
