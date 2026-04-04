import { CommonActions, type NavigationState } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { Screen_tab, IScreen } from "../models/screen";
import type { ITab, IScreenData } from "../models/screen";
import type { IAllScreenParamList } from "./types";

export type IRootStack = "onboarding" | "mainTabs" | "subscription";

export function getCurrentTab(): ITab | undefined {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const navState = navigationRef.getRootState();
  if (!navState) {
    return undefined;
  }
  const rootRoute = navState.routes[navState.index ?? 0];
  if (rootRoute.name !== "mainTabs") {
    return undefined;
  }
  const tabsState = rootRoute.state as NavigationState | undefined;
  if (!tabsState) {
    return undefined;
  }
  const activeTab = tabsState.routes[tabsState.index ?? 0];
  return activeTab.name as ITab;
}

function getCurrentRoot(): IRootStack | undefined {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const navState = navigationRef.getRootState();
  if (!navState) {
    return undefined;
  }
  return navState.routes[navState.index ?? 0].name as IRootStack;
}

export interface INavigateOpts {
  tab?: ITab;
  stack?: IRootStack;
}

export function navigateTo<T extends IScreen>(screen: T, params?: IAllScreenParamList[T], opts?: INavigateOpts): void {
  if (!navigationRef.isReady()) {
    return;
  }

  if (opts?.stack === "subscription") {
    navigationRef.dispatch(CommonActions.navigate({ name: "subscription", params: params as object | undefined }));
    return;
  }

  if (opts?.tab) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "mainTabs",
            state: {
              routes: [
                {
                  name: opts.tab,
                  state: {
                    index: 0,
                    routes: [{ name: screen, params }],
                  },
                },
              ],
            },
          },
        ],
      })
    );
    return;
  }

  const currentRoot = getCurrentRoot();

  if (currentRoot === "onboarding") {
    navigationRef.dispatch(CommonActions.navigate({ name: "onboarding", params: { screen, params } }));
  } else if (currentRoot === "mainTabs") {
    const tab = getCurrentTab() ?? Screen_tab(screen);
    navigationRef.dispatch(
      CommonActions.navigate({
        name: "mainTabs",
        params: {
          screen: tab,
          params: {
            screen,
            params,
            initial: false,
          },
        },
      })
    );
  } else {
    navigationRef.dispatch(CommonActions.navigate({ name: screen as string, params: params as object | undefined }));
  }
}

export function goBack(): void {
  if (!navigationRef.isReady()) {
    return;
  }
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function getCurrentScreenData(): IScreenData | undefined {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const route = navigationRef.getCurrentRoute();
  if (!route) {
    return undefined;
  }
  return { name: route.name, params: route.params } as IScreenData;
}
