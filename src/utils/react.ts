import { useState, useEffect, Dispatch, useRef } from "react";

export namespace ReactUtils {
  export function useStateWithCallback<S>(initialState: S | (() => S), callback: (state: S) => void): [S, Dispatch<S>] {
    const [state, setState] = useState<S>(initialState);
    const didMount = useRef(false);
    useEffect(() => {
      if (!didMount.current) {
        didMount.current = true;
      } else {
        callback(state);
      }
    }, [state]);
    return [state, setState];
  }
}
