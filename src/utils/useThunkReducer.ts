import { Reducer, useCallback, useRef, useState } from "react";
import { IGDispatch, IGThunk, IReducerOnIGAction } from "../ducks/types";

let _perfThunkId = 0;

export function useThunkReducer<TState, TAction extends Record<string, unknown>, TEnv>(
  reducer: Reducer<TState, TAction>,
  initialState: TState,
  env: TEnv,
  onActions: IReducerOnIGAction<TState, TAction, TEnv>[] = [],
  onStateChange?: (state: TState) => void
): [TState, IGDispatch<TState, TAction, TEnv>] {
  const [hookState, setHookState] = useState(initialState);

  const state = useRef(hookState);
  const getState = useCallback(() => state.current, [state]);
  const setState = useCallback(
    (newState: TState): void => {
      state.current = newState;
      if (onStateChange) {
        onStateChange(newState);
      } else {
        setHookState(newState);
      }
    },
    [state, setHookState, onStateChange]
  );

  const reduce = useCallback((action: TAction): TState => reducer(getState(), action), [reducer, getState]);

  const dispatch = useCallback(
    (action: IGThunk<TState, TAction, TEnv> | TAction) => {
      const oldState = state.current;
      if (typeof action === "function") {
        const thunkId = ++_perfThunkId;
        const thunkName = action.name || action.toString().slice(0, 80);
        console.log(`[PERF] thunk #${thunkId} START: ${thunkName}`);
        const t0Thunk = Date.now();
        (action(dispatch, getState, env) as Promise<void>).then(() => {
          const thunkMs = Date.now() - t0Thunk;
          if (thunkMs > 5) {
            console.log(`[PERF] thunk #${thunkId} END: ${thunkMs}ms (${thunkName})`);
          }
          const t0OnActions = Date.now();
          for (const onAction of onActions) {
            onAction(dispatch, action, oldState, state.current);
          }
          const onActionsMs = Date.now() - t0OnActions;
          if (onActionsMs > 2) {
            console.log(`[PERF] thunk #${thunkId} onActions: ${onActionsMs}ms`);
          }
        });
      } else {
        const actionType = "type" in action ? (action as Record<string, unknown>).type : "unknown";
        const actionDesc = "desc" in action ? (action as Record<string, unknown>).desc : undefined;
        const t0Reduce = Date.now();
        const newState = reduce(action);
        const reduceMs = Date.now() - t0Reduce;
        const t0SetState = Date.now();
        setState(newState);
        const setStateMs = Date.now() - t0SetState;
        const t0OnActions = Date.now();
        for (const onAction of onActions) {
          onAction(dispatch, action, oldState, state.current);
        }
        const onActionsMs = Date.now() - t0OnActions;
        if (reduceMs > 2 || setStateMs > 2 || onActionsMs > 2) {
          console.log(
            `[PERF] sync dispatch ${actionType}${actionDesc ? `(${actionDesc})` : ""}: reduce=${reduceMs}ms, setState=${setStateMs}ms, onActions=${onActionsMs}ms`
          );
        }
      }
    },
    [getState, setState, reduce]
  );

  return [hookState, dispatch];
}
