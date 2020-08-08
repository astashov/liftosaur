import { useRef, useCallback, Reducer, useState } from "preact/hooks";
import { IDispatch, IThunk } from "../ducks/types";
import { IAction, IState, IEnv } from "../ducks/reducer";

export function useThunkReducer(
  reducer: Reducer<IState, IAction>,
  initialState: IState,
  env: IEnv,
  onActions: Array<(action: IAction | IThunk, oldState: IState, newState: IState) => void | Promise<void>> = []
): [IState, IDispatch] {
  const [hookState, setHookState] = useState(initialState);

  // State management.
  const state = useRef(hookState);
  const getState = useCallback(() => state.current, [state]);
  const setState = useCallback(
    (newState: IState): void => {
      state.current = newState;
      setHookState(newState);
    },
    [state, setHookState]
  );

  // Reducer.
  const reduce = useCallback((action: IAction): IState => reducer(getState(), action), [reducer, getState]);

  // Augmented dispatcher.
  const dispatch = useCallback(
    (action: IThunk | IAction) => {
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
