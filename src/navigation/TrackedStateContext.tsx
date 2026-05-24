import { createContainer, getUntrackedObject } from "react-tracked";
import type { IState } from "../models/state";
import type { IDispatch } from "../ducks/types";

interface ITrackedStateProviderProps {
  state: IState;
  dispatch: IDispatch;
}

function useTrackedStateValue(props: ITrackedStateProviderProps): readonly [IState, IDispatch] {
  return [props.state, props.dispatch] as const;
}

const container = createContainer(useTrackedStateValue);

export const TrackedStateProvider = container.Provider;
export const useTrackedState = container.useTrackedState;
export const useTrackedDispatch = container.useUpdate;

export function untrack<T>(value: T): T {
  const untracked = getUntrackedObject(value);
  return (untracked ?? value) as T;
}
