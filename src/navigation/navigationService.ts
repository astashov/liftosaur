import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { Screen_tab, IScreen } from "../models/screen";
import type { ITab } from "../models/screen";
import type { IAllScreenParamList, IOnboardingStackParamList } from "./types";

const tabNameMap: Record<ITab, string> = {
  home: "homeTab",
  program: "programTab",
  workout: "workoutTab",
  graphs: "graphsTab",
  me: "meTab",
};

const onboardingScreens: Set<string> = new Set<keyof IOnboardingStackParamList>([
  "first",
  "units",
  "setupequipment",
  "setupplates",
  "onboarding/programselect",
  "onboarding/programs",
  "onboarding/programPreview",
]);

export function navigateTo<T extends IScreen>(
  screen: T,
  params?: IAllScreenParamList[T],
  shouldResetStack?: boolean
): void {
  if (!navigationRef.isReady()) return;

  if (onboardingScreens.has(screen)) {
    navigationRef.dispatch(
      CommonActions.navigate({ name: "onboarding", params: { screen, params } })
    );
    return;
  }

  const tab = Screen_tab(screen);
  const tabName = tabNameMap[tab];

  if (shouldResetStack) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "mainTabs",
            state: {
              routes: [
                {
                  name: tabName,
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
  } else {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: "mainTabs",
        params: {
          screen: tabName,
          params: {
            screen,
            params,
            initial: false,
          },
        },
      })
    );
  }
}

export function goBack(): void {
  if (!navigationRef.isReady()) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
