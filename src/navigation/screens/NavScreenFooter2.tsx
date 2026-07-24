import { JSX } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationState } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { Footer2View } from "../../components/footer2";
import type { IScreen, ITab } from "../../models/screen";

const screensWithoutFooter: string[] = ["subscription", "onerms"];

function getTopRouteOfActiveTab(tabState: BottomTabBarProps["state"]): IScreen | undefined {
  const activeTab = tabState.routes[tabState.index];
  const tabStackState = activeTab.state as NavigationState | undefined;
  if (!tabStackState) {
    return undefined;
  }
  return tabStackState.routes[tabStackState.index ?? 0].name as IScreen;
}

export function Footer2Wrapper(props: BottomTabBarProps): JSX.Element | null {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const topRoute = getTopRouteOfActiveTab(props.state);
  if (topRoute != null && screensWithoutFooter.includes(topRoute)) {
    return null;
  }
  const currentTab = props.state.routes[props.state.index].name as ITab;
  const navCommon = untrack(buildNavCommon(state));
  return <Footer2View dispatch={dispatch} navCommon={navCommon} currentTab={currentTab} />;
}
