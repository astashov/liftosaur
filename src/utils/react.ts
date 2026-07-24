import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

export function ReactUtils_useStateWithCallback<S>(
  initialState: S | (() => S),
  callback: (state: S) => void
): [S, Dispatch<SetStateAction<S>>] {
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

export function ReactUtils_usePropToRef<T>(prop: T): { current: T } {
  const ref = useRef<T>(prop);
  useEffect(() => {
    ref.current = prop;
  }, [prop]);
  return ref;
}
