import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { Screen_tab, IScreen } from "../models/screen";
import type { ITab } from "../models/screen";
import type { IAllScreenParamList } from "./types";

const tabNameMap: Record<ITab, string> = {
  home: "homeTab",
  program: "programTab",
  workout: "workoutTab",
  graphs: "graphsTab",
  me: "meTab",
};

export function navigateTo<T extends IScreen>(
  screen: T,
  params?: IAllScreenParamList[T],
  shouldResetStack?: boolean
): void {
  if (!navigationRef.isReady()) {
    return;
  }

  const tab = Screen_tab(screen);
  const tabName = tabNameMap[tab];

  if (shouldResetStack) {
    const navState = navigationRef.getRootState();
    const tabIndex = navState.routes.findIndex((r) => r.name === tabName);
    const newRoutes = navState.routes.map((route, i) => {
      if (i === tabIndex) {
        return {
          ...route,
          state: {
            index: 0,
            routes: [{ name: screen, params }],
          },
        };
      }
      return route;
    });
    navigationRef.dispatch(
      CommonActions.reset({
        ...navState,
        index: tabIndex,
        routes: newRoutes,
      })
    );
  } else {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: tabName,
        params: {
          screen,
          params,
          initial: false,
        },
      })
    );
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
