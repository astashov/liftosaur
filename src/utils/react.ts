import { useState, useEffect, StateUpdater } from "preact/hooks";

export namespace ReactUtils {
  export function useStateWithCallback<S>(
    initialState: S | (() => S),
    callback: (state: S) => void
  ): [S, StateUpdater<S>] {
    const [state, setState] = useState<S>(initialState);
    useEffect(() => callback(state), [state]);
    return [state, setState];
  }
}
