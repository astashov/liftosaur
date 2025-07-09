import { useState, useEffect, StateUpdater, useRef } from "preact/hooks";

export namespace ReactUtils {
  export function useStateWithCallback<S>(
    initialState: S | (() => S),
    callback: (state: S) => void
  ): [S, StateUpdater<S>] {
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

  export function usePropToRef<T>(prop: T): { current: T } {
    const ref = useRef<T>(prop);
    useEffect(() => {
      ref.current = prop;
    }, [prop]);
    return ref;
  }
}
