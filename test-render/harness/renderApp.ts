import { act, cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import { createElement } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppRoot } from "../../src/App.native";
import { IEnv, IState } from "../../src/models/state";
import { navigationRef } from "../../src/navigation/navigationRef";
import { CommitObserver_install, IRenderMount } from "./commitObserver";
import { FrameLoop_cancelAll } from "../setup/frameLoop";
import { IRenderSelector, IRenderTrace } from "./renderTrace";

// A debounce or a delayed animation renders after the press resolves, and act does not drain
// timers. 300ms is long enough for the 250ms rest-timer tick, the slowest delay on this screen.
const SETTLE_MS = 300;

export interface IRenderApp {
  mounted: (selector: IRenderSelector) => IRenderMount[];
  goToHomeTab: () => Promise<void>;
  goToWorkout: () => Promise<void>;
  completeSet: (index: number) => Promise<void>;
  record: (fn: () => Promise<void>) => Promise<IRenderTrace>;
  unmount: () => Promise<void>;
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
  });
}

export async function RenderApp_mount(initialState: IState, env: IEnv): Promise<IRenderApp> {
  // Installed before the first render: installed after, start() cannot seed identities and every
  // fiber looks freshly mounted.
  const observer = CommitObserver_install();
  try {
    await render(
      createElement(
        GestureHandlerRootView,
        { style: { flex: 1 } },
        createElement(SafeAreaProvider, null, createElement(AppRoot, { initialState, env }))
      )
    );
    await act(async () => {
      navigationRef.navigate("mainTabs", { screen: "workout", params: { screen: "progress", params: { id: 0 } } });
    });
    await settle();
  } catch (e) {
    observer.dispose();
    await cleanup();
    throw e;
  }

  return {
    mounted: (selector: IRenderSelector): IRenderMount[] => observer.mounted(selector),
    completeSet: async (index: number): Promise<void> => {
      const controls = screen.getAllByTestId("complete-set");
      if (controls[index] == null) {
        throw new Error(`No complete-set control at index ${index}; found ${controls.length}`);
      }
      await act(async () => {
        fireEvent.press(controls[index]);
      });
    },
    goToHomeTab: async (): Promise<void> => {
      await act(async () => {
        navigationRef.navigate("mainTabs", { screen: "home", params: { screen: "main", params: undefined } });
      });
      await settle();
    },
    goToWorkout: async (): Promise<void> => {
      await act(async () => {
        navigationRef.navigate("mainTabs", { screen: "workout", params: { screen: "progress", params: { id: 0 } } });
      });
      await settle();
    },
    record: async (fn: () => Promise<void>): Promise<IRenderTrace> => {
      observer.start();
      try {
        await fn();
        await settle();
        return observer.stop();
      } catch (e) {
        observer.stop();
        throw e;
      }
    },
    unmount: async (): Promise<void> => {
      try {
        await cleanup();
      } finally {
        observer.dispose();
        FrameLoop_cancelAll();
        await env.persistence.flushSave();
      }
    },
  };
}
