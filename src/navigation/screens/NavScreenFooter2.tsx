import { JSX } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationState } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { Footer2View } from "../../components/footer2";
import type { IScreen } from "../../models/screen";

const screensWithoutFooter: string[] = ["programs", "me/programs", "subscription"];

function getScreenFromTabProps(tabState: BottomTabBarProps["state"]): IScreen {
  const activeTab = tabState.routes[tabState.index];
  const tabStackState = activeTab.state as NavigationState | undefined;
  if (tabStackState) {
    return tabStackState.routes[tabStackState.index ?? 0].name as IScreen;
  }
  const tabToDefaultScreen: Record<string, IScreen> = {
    homeTab: "main",
    programTab: "programs",
    workoutTab: "progress",
    graphsTab: "graphs",
    meTab: "settings",
  };
  return tabToDefaultScreen[activeTab.name] ?? "main";
}

export function Footer2Wrapper(props: BottomTabBarProps): JSX.Element | null {
  const { state, dispatch } = useAppState();
  const currentScreen = getScreenFromTabProps(props.state);
  if (screensWithoutFooter.includes(currentScreen)) {
    return null;
  }
  const navCommon = buildNavCommon(state);
  return <Footer2View isStatic dispatch={dispatch} navCommon={navCommon} screen={currentScreen} />;
}
