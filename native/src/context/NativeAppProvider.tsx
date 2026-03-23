import React, { useEffect, useRef } from "react";
import { useThunkReducer } from "@shared/utils/useThunkReducer";
import { reducerWrapper, defaultOnActions } from "@shared/ducks/reducer";
import type { IAction } from "@shared/ducks/reducer";
import type { IEnv, IState } from "@shared/models/state";
import { Service } from "@shared/api/service";
import { MockAudioInterface } from "@shared/lib/audioInterface";
import { AsyncQueue } from "@shared/utils/asyncQueue";
import { useStore } from "./StoreContext";
import { DispatchProvider } from "./DispatchContext";
import { NavigationRef_navigate, NavigationRef_goBack } from "../navigation/navigationRef";

interface IProps {
  children: React.ReactNode;
}

export function NativeAppProvider({ children }: IProps): React.ReactElement {
  const store = useStore();
  const initialState = store.getState();
  const service = useRef(new Service(fetch)).current;
  const audio = useRef(new MockAudioInterface()).current;
  const queue = useRef(new AsyncQueue()).current;

  const env: IEnv = {
    service,
    audio,
    queue,
    navigate: NavigationRef_navigate,
    goBack: NavigationRef_goBack,
  };

  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(
    reducerWrapper(false),
    initialState,
    env,
    defaultOnActions(env)
  );

  const prevStateRef = useRef(state);
  useEffect(() => {
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;
      store.setState(state);
    }
  }, [state]);

  return <DispatchProvider dispatch={dispatch}>{children}</DispatchProvider>;
}
