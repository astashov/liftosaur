import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react-native";
import { createElement } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppRoot } from "../../src/App.native";
import { IEnv, IState } from "../../src/models/state";
import { navigationRef } from "../../src/navigation/navigationRef";
import { navigateTo } from "../../src/navigation/navigationService";
import { DayLiftoEditorInline_commitDelayMs } from "../../src/components/editProgram/dayLiftoEditorInline";
import { CommitObserver_install, IRenderMount } from "./commitObserver";
import { FrameLoop_cancelAll } from "../setup/frameLoop";
import { IRenderSelector, IRenderTrace } from "./renderTrace";

// A debounce or a delayed animation renders after the press resolves, and act does not drain
// timers. 300ms is long enough for the 250ms rest-timer tick, the slowest delay on this screen.
const SETTLE_MS = 300;
const EDITOR_COMMIT_MS = DayLiftoEditorInline_commitDelayMs + 50;
const MAX_QUIET_ROUNDS = 20;

export interface IRenderApp {
  mounted: (selector: IRenderSelector) => IRenderMount[];
  goToHomeTab: () => Promise<void>;
  goToWorkout: () => Promise<void>;
  openProgram: (via?: "reset" | "navigate") => Promise<void>;
  completeSet: (index: number) => Promise<void>;
  tapFooter: (tab: "home" | "program" | "workout" | "graphs" | "me") => Promise<void>;
  press: (testID: string, opts?: { index?: number; within?: string }) => Promise<void>;
  typeInEditor: (editorIndex: number, find: string, replace: string) => Promise<void>;
  changeText: (displayValue: string, text: string) => Promise<void>;
  settle: () => Promise<void>;
  settleUntilQuiet: () => Promise<void>;
  record: (fn: () => Promise<void>) => Promise<IRenderTrace>;
  recordUntilQuiet: (fn: () => Promise<void>) => Promise<IRenderRecording>;
  unmount: () => Promise<void>;
}

export interface IRenderRecording {
  trace: IRenderTrace;
  windows: number;
  actionMs: number;
  actionCommits: number;
  commits: number;
}

export interface IRenderAppOpts {
  start?: "workout" | "home";
}

async function wait(ms: number): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  });
}

async function settle(): Promise<void> {
  await wait(SETTLE_MS);
}

export async function RenderApp_mount(initialState: IState, env: IEnv, opts: IRenderAppOpts = {}): Promise<IRenderApp> {
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
    if (opts.start !== "home") {
      await act(async () => {
        navigationRef.navigate("mainTabs", { screen: "workout", params: { screen: "progress", params: { id: 0 } } });
      });
    }
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
    openProgram: async (via: "reset" | "navigate" = "reset"): Promise<void> => {
      const programId = initialState.storage.currentProgramId;
      if (programId == null || initialState.editProgramStates[programId] == null) {
        throw new Error("openProgram needs Fixture_build({ editingProgram: true })");
      }
      await act(async () => {
        if (via === "reset") {
          navigateTo("editProgram", { programId }, { tab: "program" });
        } else {
          navigationRef.navigate("mainTabs", {
            screen: "program",
            params: { screen: "editProgram", params: { programId } },
          });
        }
      });
      if (navigationRef.getCurrentRoute()?.name !== "editProgram") {
        throw new Error(`openProgram via ${via} landed on ${navigationRef.getCurrentRoute()?.name}`);
      }
    },
    press: async (testID: string, pressOpts: { index?: number; within?: string } = {}): Promise<void> => {
      const scope = pressOpts.within != null ? within(screen.getByTestId(pressOpts.within)) : screen;
      const controls = scope.getAllByTestId(testID);
      const index = pressOpts.index ?? 0;
      if (controls[index] == null) {
        throw new Error(`No ${testID} at index ${index}; found ${controls.length}`);
      }
      await act(async () => {
        fireEvent.press(controls[index]);
      });
    },
    tapFooter: async (tab: "home" | "program" | "workout" | "graphs" | "me"): Promise<void> => {
      await act(async () => {
        fireEvent.press(screen.getByTestId(`footer-${tab}`));
      });
      await settle();
    },
    typeInEditor: async (editorIndex: number, find: string, replace: string): Promise<void> => {
      const editors = screen.container.queryAll((node) => typeof node.props.onTextDelta === "function");
      const editor = editors[editorIndex];
      if (editor == null) {
        throw new Error(`No editor at index ${editorIndex}; found ${editors.length}`);
      }
      const text: string = editor.props.initialText;
      const start = text.indexOf(find);
      if (start === -1) {
        throw new Error(`Editor ${editorIndex} has no "${find}"`);
      }
      await act(async () => {
        editor.props.onTextDelta({
          nativeEvent: {
            start,
            end: start + find.length,
            insertedText: replace,
            textLength: text.length - find.length + replace.length,
          },
        });
      });
      await wait(EDITOR_COMMIT_MS);
    },
    changeText: async (displayValue: string, text: string): Promise<void> => {
      await act(async () => {
        fireEvent.changeText(screen.getByDisplayValue(displayValue), text);
      });
    },
    settle,
    settleUntilQuiet: async (): Promise<void> => {
      for (let round = 0; round < MAX_QUIET_ROUNDS; round += 1) {
        observer.start();
        await settle();
        const quiet = observer.observed() === 0;
        observer.stop();
        if (quiet) {
          return;
        }
      }
      throw new Error(`Still rendering after ${MAX_QUIET_ROUNDS} settle windows`);
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
    recordUntilQuiet: async (fn: () => Promise<void>): Promise<IRenderRecording> => {
      observer.start();
      try {
        const startedAt = performance.now();
        await fn();
        const actionMs = performance.now() - startedAt;
        const actionCommits = observer.commits();
        for (let round = 1; round <= MAX_QUIET_ROUNDS; round += 1) {
          const before = observer.observed();
          await settle();
          if (observer.observed() === before) {
            const commits = observer.commits();
            return { trace: observer.stop(), windows: round, actionMs, actionCommits, commits };
          }
        }
        throw new Error(`Still rendering after ${MAX_QUIET_ROUNDS} settle windows`);
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
