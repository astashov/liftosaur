import { JSX } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { Footer2View } from "../../components/footer2";
import { getCurrentScreenData } from "../navigationService";

const screensWithoutFooter = ["programs", "me/programs", "subscription"];

export function Footer2Wrapper(_props: BottomTabBarProps): JSX.Element | null {
  const { state, dispatch } = useAppState();
  const currentScreen = getCurrentScreenData()?.name ?? "main";
  if (screensWithoutFooter.includes(currentScreen)) {
    return null;
  }
  const navCommon = buildNavCommon(state);
  return <Footer2View isStatic dispatch={dispatch} navCommon={navCommon} />;
}
