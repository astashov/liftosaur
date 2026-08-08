import { JSX, useContext, useEffect } from "react";
import { View } from "react-native";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
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
  // BottomTabView only learns the tab bar's height if the bar reports it; with a custom
  // tabBar that never does, BottomTabBarHeightContext keeps react-navigation's estimate for
  // the *default* bar, which is shorter than this footer. Anything positioning against the
  // tab bar — the editor dock — reads that value, so report the measured height instead.
  const setTabBarHeight = useContext(BottomTabBarHeightCallbackContext);
  const topRoute = getTopRouteOfActiveTab(props.state);
  const isHidden = topRoute != null && screensWithoutFooter.includes(topRoute);
  useEffect(() => {
    if (isHidden) {
      setTabBarHeight?.(0);
    }
  }, [isHidden, setTabBarHeight]);
  if (isHidden) {
    return null;
  }
  const currentTab = props.state.routes[props.state.index].name as ITab;
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View onLayout={(e) => setTabBarHeight?.(e.nativeEvent.layout.height)}>
      <Footer2View dispatch={dispatch} navCommon={navCommon} currentTab={currentTab} />
    </View>
  );
}
