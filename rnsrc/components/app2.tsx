import "../global.css";
import React, { createContext, useEffect, useRef } from "react";
import { IInitializeEssentials } from "../initialize";
import { Service } from "../../src/api/service";
import { lb } from "lens-shmens";
import { reducerWrapper, defaultOnActions } from "../../src/ducks/reducer";
import { Thunk } from "../../src/ducks/thunks";
import { IEnv, IState, updateState } from "../../src/models/state";
import { SendMessage } from "../../src/utils/sendMessage";
import { Subscriptions } from "../../src/utils/subscriptions";
import { UrlUtils } from "../../src/utils/url";
import { Screen } from "../../src/models/screen";
import { WebViewScreen } from "./webViewScreen";
import { IDispatch } from "../../src/ducks/types";
import { useThunkReducer } from "../../src/utils/useThunkReducer";
import { ScreenMeasurements } from "../../src/components/screenMeasurements";
import { ScreenStats } from "../../src/components/screenStats";
import { Program } from "../../src/models/program";
import { ProgramHistoryView } from "../../src/components/programHistory";

interface IAppProps {
  essentials?: IInitializeEssentials;
}

interface IAppContext {
  state?: IState;
  dispatch?: IDispatch;
  env?: IEnv;
}
export const DefaultPropsContext = createContext<IAppContext>({});

export default function App(props: IAppProps): JSX.Element {
  const { client, audio, queue, initialState } = props.essentials!;
  const service = new Service(client);
  const env: IEnv = { service, audio, queue };
  const [state, dispatch] = useThunkReducer(reducerWrapper(true), initialState, env, defaultOnActions(env));
  const stateRef = useRef<IState>(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    SendMessage.toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage.toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
  }, [state.storage.settings.alwaysOnDisplay]);

  useEffect(() => {
    const url =
      typeof document !== "undefined" ? UrlUtils.build(document.location.href, "https://liftosaur.com") : undefined;
    const urlUserId = url != null ? url.searchParams.get("userid") || undefined : undefined;
    if (state.adminKey != null && urlUserId != null) {
      const storageId = url != null ? url.searchParams.get("storageid") || undefined : undefined;
      dispatch(Thunk.fetchStorage(storageId));
    } else {
      dispatch(Thunk.sync2({ force: true }));
    }
    const userId = state.user?.id || state.storage.tempUserId;
    Subscriptions.cleanupOutdatedAppleReceipts(dispatch, userId, service, state.storage.subscription);
    Subscriptions.cleanupOutdatedGooglePurchaseTokens(dispatch, userId, service, state.storage.subscription);
    dispatch(Thunk.fetchInitial());
    if (typeof window !== "undefined") {
      const source = url?.searchParams.get("s");
      if (source) {
        updateState(dispatch, [
          lb<IState>()
            .p("storage")
            .p("affiliates")
            .recordModify((affiliates) => ({ [source]: Date.now(), ...affiliates })),
        ]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).replaceState = (newState: any) => {
        dispatch({ type: "ReplaceState", state: newState });
      };
    }
    SendMessage.toIos({ type: "loaded", userid: userId });
    SendMessage.toAndroid({ type: "loaded", userid: userId });
  }, []);

  const screen = Screen.current(state.screenStack);
  const currentProgram =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  return (
    <DefaultPropsContext.Provider value={{ state, dispatch, env }}>
      {screen === "measurements" ? (
        <ScreenMeasurements
          loading={state.loading}
          screenStack={state.screenStack}
          subscription={state.storage.subscription}
          dispatch={dispatch}
          settings={state.storage.settings}
          stats={state.storage.stats}
        />
      ) : screen === "stats" ? (
        <ScreenStats
          screenStack={state.screenStack}
          loading={state.loading}
          dispatch={dispatch}
          settings={state.storage.settings}
          stats={state.storage.stats}
        />
      ) : screen === "main" && currentProgram ? (
        <ProgramHistoryView
          editProgramId={state.progress[0]?.programId}
          screenStack={state.screenStack}
          loading={state.loading}
          allPrograms={state.storage.programs}
          program={currentProgram}
          progress={state.progress?.[0]}
          userId={state.user?.id}
          stats={state.storage.stats}
          settings={state.storage.settings}
          history={state.storage.history}
          subscription={state.storage.subscription}
          dispatch={dispatch}
        />
      ) : (
        <WebViewScreen />
      )}
    </DefaultPropsContext.Provider>
  );
}
