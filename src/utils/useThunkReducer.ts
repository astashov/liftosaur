import { useRef, useCallback, Reducer, useState } from "preact/hooks";
import { IGDispatch, IGThunk, IReducerOnIGAction } from "../ducks/types";

export function useThunkReducer<TState, TAction extends Record<string, unknown>, TEnv>(
  reducer: Reducer<TState, TAction>,
  initialState: TState,
  env: TEnv,
  onActions: IReducerOnIGAction<TState, TAction, TEnv>[] = []
): [TState, IGDispatch<TState, TAction, TEnv>] {
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
    (action: IGThunk<TState, TAction, TEnv> | TAction) => {
      const oldState = state.current;
      if (typeof action === "function") {
        (action(dispatch, getState, env) as Promise<void>).then(() => {
          for (const onAction of onActions) {
            onAction(dispatch, action, oldState, state.current);
          }
        });
      } else {
        const newState = reduce(action);
        setState(newState);
        for (const onAction of onActions) {
          onAction(dispatch, action, oldState, state.current);
        }
      }
    },
    [getState, setState, reduce]
  );

  return [hookState, dispatch];
}
