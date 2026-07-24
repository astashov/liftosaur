import type { NavigationState, PartialState } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { IDispatch } from "../ducks/types";
import { Thunk_cleanupRemovedScreens, screensWithEditState } from "../ducks/thunks";
import { IScreenData } from "../models/screen";

type INavState = NavigationState | PartialState<NavigationState>;

function collectScreens(navState: INavState, into: Map<string, IScreenData>): void {
  for (const route of navState.routes) {
    if (route.key != null && screensWithEditState.indexOf(route.name as IScreenData["name"]) !== -1) {
      into.set(route.key, { name: route.name, params: route.params } as IScreenData);
    }
    if (route.state != null) {
      collectScreens(route.state, into);
    }
  }
}

function screenStateIdentity(screen: IScreenData): string {
  if (screen.name === "progress") {
    return `progress:${screen.params?.id ?? 0}`;
  } else if (screen.name === "editProgram") {
    return `editProgram:${screen.params?.programId}`;
  } else if (screen.name === "editProgramExercise") {
    return `editProgramExercise:${screen.params?.programId}_${screen.params?.key}`;
  }
  return `${screen.name}:${JSON.stringify(screen.params ?? {})}`;
}

// Screens can be removed without going through Thunk_pullScreen — Android system
// back, iOS swipe-back, and the stack resets navigateTo does for cross-tab
// navigation. Per-screen edit state (state.progress, editProgramStates) must be
// cleaned on ANY removal, otherwise id-less actions that resolve their target
// from those maps silently hit the wrong record. Diffing route keys on every
// navigation state change catches all removal paths uniformly.
export function ScreenRemovalCleanup_subscribe(dispatch: IDispatch): () => void {
  let prevScreens = new Map<string, IScreenData>();
  if (navigationRef.isReady()) {
    const rootState = navigationRef.getRootState();
    if (rootState != null) {
      collectScreens(rootState, prevScreens);
    }
  }
  return navigationRef.addListener("state", (e) => {
    const screens = new Map<string, IScreenData>();
    if (e.data.state != null) {
      collectScreens(e.data.state, screens);
    }
    // Flows like Program_editAction init the new screen's edit state BEFORE the
    // stack reset removes the old route for the same programId — the new route
    // (different key, same identity) must keep that state, so only clean up when
    // no surviving route references it.
    const currentIdentities = new Set<string>();
    for (const screen of screens.values()) {
      currentIdentities.add(screenStateIdentity(screen));
    }
    const removed: IScreenData[] = [];
    for (const [key, screen] of prevScreens) {
      if (!screens.has(key) && !currentIdentities.has(screenStateIdentity(screen))) {
        removed.push(screen);
      }
    }
    prevScreens = screens;
    if (removed.length > 0) {
      dispatch(Thunk_cleanupRemovedScreens(removed));
    }
  });
}
