import { CommonActions, type NavigationState, type PartialState } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { IScreen } from "../models/screen";
import type { ITab, IScreenData } from "../models/screen";
import type { IAllScreenParamList, IRootStackParamList } from "./types";
import { PerfNavTracker_recordTap } from "../utils/perfNavTracker";

export type IRootStack = "onboarding" | "mainTabs" | "subscription";

export type IModalScreen = Exclude<keyof IRootStackParamList, "onboarding" | "mainTabs" | "subscription">;

export function navigateToModal<T extends IModalScreen>(
  ...args: undefined extends IRootStackParamList[T]
    ? [name: T] | [name: T, params: IRootStackParamList[T]]
    : [name: T, params: IRootStackParamList[T]]
): void {
  const [name, params] = args;
  if (!navigationRef.isReady()) {
    return;
  }
  PerfNavTracker_recordTap(name);
  navigationRef.dispatch(CommonActions.navigate({ name: name as string, params: params as object | undefined }));
}

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

export interface INavigateOpts {
  tab?: ITab;
  stack?: IRootStack;
}

function sameParams(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch {
    return false;
  }
}

export function switchTabAndReset<T extends IScreen>(tab: ITab, screen: T, params?: IAllScreenParamList[T]): void {
  if (!navigationRef.isReady()) {
    return;
  }

  const rootState = navigationRef.getRootState();
  const onMainTabs = rootState?.routes[rootState.index ?? 0]?.name === "mainTabs";
  const mainTabsRoute = rootState?.routes.find((r) => r.name === "mainTabs");
  const tabsState = mainTabsRoute?.state as NavigationState | undefined;

  if (!onMainTabs || !tabsState?.key) {
    const resetState: PartialState<NavigationState> = {
      index: 0,
      routes: [
        {
          name: "mainTabs",
          state: {
            routes: [
              {
                name: tab,
                state: { index: 0, routes: [{ name: screen, params }] },
              },
            ],
          },
        },
      ],
    };
    navigationRef.dispatch(CommonActions.reset(resetState));
    return;
  }

  const currentTab = tabsState.routes[tabsState.index ?? 0]?.name;
  const targetTabRoute = tabsState.routes.find((r) => r.name === tab);
  const innerState = targetTabRoute?.state as NavigationState | undefined;
  const innerRoutes = innerState?.routes ?? [];
  const innerTop = innerRoutes[innerRoutes.length - 1];

  const topMatchesTarget =
    innerRoutes.length === 1 && innerTop?.name === screen && sameParams(innerTop?.params, params);

  const isNoOp = currentTab === tab && topMatchesTarget;
  if (isNoOp) {
    return;
  }

  const innerAlreadyCorrect = innerState != null && topMatchesTarget;

  const tabsKey = tabsState.key;
  const innerKey = innerState?.key;

  if (innerKey && !innerAlreadyCorrect) {
    navigationRef.dispatch({
      ...CommonActions.reset({
        index: 0,
        routes: [{ name: screen as string, params: params as object | undefined }],
      }),
      target: innerKey,
    });
    requestAnimationFrame(() => {
      navigationRef.dispatch({
        ...CommonActions.navigate({ name: tab as string }),
        target: tabsKey,
      });
    });
    return;
  }

  if (innerKey) {
    navigationRef.dispatch({
      ...CommonActions.navigate({ name: tab as string }),
      target: tabsKey,
    });
  } else {
    navigationRef.dispatch({
      ...CommonActions.navigate({ name: tab as string, params: { screen, params } }),
      target: tabsKey,
    });
  }
}

export function pushToCurrentStack<T extends IScreen>(screen: T, params?: IAllScreenParamList[T]): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(CommonActions.navigate({ name: screen as string, params: params as object | undefined }));
}

export function navigateTo<T extends IScreen>(screen: T, params?: IAllScreenParamList[T], opts?: INavigateOpts): void {
  if (!navigationRef.isReady()) {
    return;
  }
  PerfNavTracker_recordTap(screen);

  if (opts?.stack === "subscription") {
    navigationRef.dispatch(CommonActions.navigate({ name: "subscription", params: params as object | undefined }));
    return;
  }

  if (opts?.tab) {
    switchTabAndReset(opts.tab, screen, params);
    return;
  }

  pushToCurrentStack(screen, params);
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
