import { useRef, useCallback, Reducer, useState } from "preact/hooks";
import { IGDispatch, IGThunk } from "../ducks/types";
import { IEnv } from "../models/state";

export function useThunkReducer<TState, TAction extends Record<string, unknown>>(
  reducer: Reducer<TState, TAction>,
  initialState: TState,
  env: IEnv,
  onActions: Array<
    (action: TAction | IGThunk<TState, TAction>, oldState: TState, newState: TState) => void | Promise<void>
  > = []
): [TState, IGDispatch<TState, TAction>] {
  const [hookState, setHookState] = useState(initialState);

  // State management.
  const state = useRef(hookState);
  const getState = useCallback(() => state.current, [state]);
  const setState = useCallback(
    (newState: TState): void => {
      state.current = newState;
      setHookState(newState);
    },
    [state, setHookState]
  );

  // Reducer.
  const reduce = useCallback((action: TAction): TState => reducer(getState(), action), [reducer, getState]);

  // Augmented dispatcher.
  const dispatch = useCallback(
    (action: IGThunk<TState, TAction> | TAction) => {
      const oldState = state.current;
      if (typeof action === "function") {
        (action(dispatch, getState, env) as Promise<void>).then(() => {
          for (const onAction of onActions) {
            onAction(action, oldState, state.current);
          }
        });
      } else {
        setState(reduce(action));
        for (const onAction of onActions) {
          onAction(action, oldState, state.current);
        }
      }
    },
    [getState, setState, reduce]
  );

  return [hookState, dispatch];
}
