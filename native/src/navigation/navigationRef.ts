import { createNavigationContainerRef, StackActions } from "@react-navigation/native";
import { screenToTab, tabInitialScreen, type IScreenName } from "./screenMap";

export const navigationRef = createNavigationContainerRef();

export function NavigationRef_navigate(screen: string, params?: unknown, shouldResetStack?: boolean): void {
  if (!navigationRef.isReady()) {
    return;
  }
  const screenName = screen as IScreenName;
  if (shouldResetStack) {
    const tab = screenToTab[screenName];
    const isInitialScreen = tabInitialScreen[tab] === screenName;
    navigationRef.reset({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          params: {
            screen: tab,
            params: { screen: isInitialScreen ? screenName : tabInitialScreen[tab] },
          },
        },
      ],
    });
    if (!isInitialScreen) {
      navigationRef.dispatch(StackActions.push(screenName, params as object));
    }
  } else {
    navigationRef.dispatch(StackActions.push(screenName, params as object));
  }
}

export function NavigationRef_goBack(): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.goBack();
}
