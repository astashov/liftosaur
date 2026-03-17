import React, { createContext, useContext, useEffect, useState } from "react";
import { StateStore } from "../store/StateStore";
import type { IState } from "@shared/models/state";

const storeInstance = new StateStore();

const StoreContext = createContext<StateStore>(storeInstance);

export function StoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    storeInstance.load().then(() => setIsLoaded(true));
  }, []);

  if (!isLoaded) {
    return <></>;
  }

  return <StoreContext.Provider value={storeInstance}>{children}</StoreContext.Provider>;
}

export function useStore(): StateStore {
  return useContext(StoreContext);
}

export function useStoreState(): IState {
  const store = useStore();
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    return store.subscribe(setState);
  }, [store]);

  return state;
}
